/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {amplify} from 'amplify';
import {Data as OpenGraphResult} from 'open-graph';
import {Asset, LinkPreview} from '@wireapp/protocol-messaging';
import {AssetRetentionPolicy} from '@wireapp/api-client/dist/asset';

import {base64ToBlob, createRandomUuid} from 'Util/util';
import {getLogger, Logger} from 'Util/Logger';

import {getFirstLinkWithOffset} from './LinkPreviewHelpers';
import {PROPERTIES_TYPE} from '../properties/PropertiesType';
import {WebAppEvents} from '../event/WebApp';
import {PROTO_MESSAGE_TYPE} from '../cryptography/ProtoMessageType';
import {isBlacklisted} from './LinkPreviewBlackList';
import {buildFromOpenGraphData} from './LinkPreviewProtoBuilder';
import {LinkPreviewError} from '../error/LinkPreviewError';
import {AssetUploader} from '../assets/AssetUploader';
import {PropertiesRepository} from '../properties/PropertiesRepository';

declare global {
  interface Window {
    openGraphAsync?: (url: string) => Promise<OpenGraphResult>;
  }
}

export class LinkPreviewRepository {
  assetUploader: AssetUploader;
  logger: Logger;
  shouldSendPreviews: boolean;

  constructor(assetUploader: AssetUploader, propertiesRepository: PropertiesRepository) {
    this.assetUploader = assetUploader;
    this.logger = getLogger('LinkPreviewRepository');

    this.shouldSendPreviews = propertiesRepository.getPreference(PROPERTIES_TYPE.PREVIEWS.SEND);

    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.PREVIEWS.SEND, this.updatedSendPreference);
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, ({settings}: any) => {
      this.updatedSendPreference(settings.previews.send);
    });
  }

  /**
   * Searches for URL in given string and creates a link preview.
   *
   * @note This will already upload the associated image as asset
   * @param string Input text to generate preview for
   * @returns Resolves with link preview proto message
   */
  getLinkPreviewFromString = async (string: string): Promise<LinkPreview | void> => {
    if (!this.shouldSendPreviews || !window.openGraphAsync) {
      return;
    }

    const linkData = getFirstLinkWithOffset(string);
    if (!linkData) {
      return;
    }

    try {
      return await this._getLinkPreview(linkData.url, linkData.offset);
    } catch (error) {
      const isLinkPreviewError = error instanceof LinkPreviewError;
      if (!isLinkPreviewError) {
        throw error;
      }
    }
  };

  /**
   * Creates link preview for given link. This will upload associated image as asset and will
   * resolve with a LinkPreview instance
   *
   * @param url URL found to generate link preview from
   * @param offset starting index of the link
   * @returns Resolves with a link preview if generated
   */
  async _getLinkPreview(url: string, offset: number = 0): Promise<LinkPreview> {
    if (isBlacklisted(url)) {
      throw new LinkPreviewError(LinkPreviewError.TYPE.BLACKLISTED, LinkPreviewError.MESSAGE.BLACKLISTED);
    }

    const openGraphData = await this._fetchOpenGraphData(url);
    if (!openGraphData || openGraphData instanceof Error) {
      throw new LinkPreviewError(LinkPreviewError.TYPE.NO_DATA_AVAILABLE, LinkPreviewError.MESSAGE.NO_DATA_AVAILABLE);
    }

    const linkPreview = buildFromOpenGraphData(openGraphData, url, offset);

    if (!linkPreview) {
      throw new LinkPreviewError(LinkPreviewError.TYPE.UNSUPPORTED_TYPE, LinkPreviewError.MESSAGE.UNSUPPORTED_TYPE);
    }
    return this._fetchPreviewImage(linkPreview, openGraphData.image as {data: string});
  }

  /**
   * Update the send link preview preference
   * @param sendPreviewsPreference Updated preference
   */
  updatedSendPreference = (sendPreviewsPreference: boolean): void => {
    this.shouldSendPreviews = sendPreviewsPreference;
  };

  /**
   * Fetch and upload open graph images.
   *
   * @param linkPreview Link preview proto message
   * @param openGraphImage Open graph image URL
   * @returns Resolves with the link preview proto message
   */
  private async _fetchPreviewImage(linkPreview: LinkPreview, openGraphImage?: {data: string}): Promise<LinkPreview> {
    if (openGraphImage?.data) {
      try {
        const asset = await this._uploadPreviewImage(openGraphImage.data);
        linkPreview.article[PROTO_MESSAGE_TYPE.LINK_PREVIEW_IMAGE] = asset; // deprecated
        linkPreview[PROTO_MESSAGE_TYPE.LINK_PREVIEW_IMAGE] = asset;
      } catch (error) {
        this.logger.error(error);
      }
    }

    return linkPreview;
  }

  /**
   * Fetch open graph data.
   *
   * @param link Link to fetch open graph data from
   * @returns Resolves with the retrieved open graph data
   */
  async _fetchOpenGraphData(link: string): Promise<OpenGraphResult | Error | undefined> {
    try {
      const data = await window.openGraphAsync(link);
      if (data) {
        return Object.entries(data).reduce((result: OpenGraphResult, [key, value]) => {
          result[key] = Array.isArray(value) ? value[0] : value;
          return result;
        }, {} as OpenGraphResult);
      }
      return undefined;
    } catch (error) {
      this.logger.warn(`Error while fetching OpenGraph data: ${error.message}`);
      return error;
    }
  }

  /**
   * Upload open graph image as asset
   *
   * @param dataUri image data as base64 encoded data URI
   * @returns Resolves with the uploaded asset
   */
  private async _uploadPreviewImage(dataUri: string): Promise<Asset> {
    const blob = await base64ToBlob(dataUri);
    return this.assetUploader.uploadFile(
      createRandomUuid(),
      blob,
      {expectsReadConfirmation: false, public: true, retention: AssetRetentionPolicy.PERSISTENT},
      true,
    );
  }
}
