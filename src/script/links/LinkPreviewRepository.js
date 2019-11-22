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

import {base64ToBlob} from 'Util/util';

import {getFirstLinkWithOffset} from './LinkPreviewHelpers';
import {PROPERTIES_TYPE} from '../properties/PropertiesType';
import {WebAppEvents} from '../event/WebApp';
import {PROTO_MESSAGE_TYPE} from '../cryptography/ProtoMessageType';
import {isBlacklisted} from './LinkPreviewBlackList';
import {buildFromOpenGraphData} from './LinkPreviewProtoBuilder';
import {getLogger} from 'Util/Logger';

class LinkPreviewRepository {
  constructor(assetService, propertiesRepository) {
    this.getLinkPreviewFromString = this.getLinkPreviewFromString.bind(this);
    this.updatedSendPreference = this.updatedSendPreference.bind(this);

    this.assetService = assetService;
    this.logger = getLogger('LinkPreviewRepository');

    this.shouldSendPreviews = propertiesRepository.getPreference(PROPERTIES_TYPE.PREVIEWS.SEND);

    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.PREVIEWS.SEND, this.updatedSendPreference);
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, properties => {
      this.updatedSendPreference(properties.settings.previews.send);
    });
  }

  /**
   * Searches for url in given string and creates a link preview.
   *
   * @note This will already upload the associated image as asset
   * @param {string} string - Input text to generate preview for
   * @returns {Promise} Resolves with link preview proto message
   */
  getLinkPreviewFromString(string) {
    if (!this.shouldSendPreviews || !window.openGraphAsync) {
      return Promise.resolve();
    }
    const linkData = getFirstLinkWithOffset(string);
    if (!linkData) {
      return Promise.resolve();
    }

    return this._getLinkPreview(linkData.url, linkData.offset).catch(error => {
      const isLinkPreviewError = error instanceof z.error.LinkPreviewError;
      if (!isLinkPreviewError) {
        throw error;
      }
    });
  }

  /**
   * Creates link preview for given link. This will upload associated image as asset and will
   * resolve with a LinkPreview instance
   *
   * @param {string} url - URL found to generate link preview from
   * @param {number} [offset=0] - starting index of the link
   * @returns {Promise} Resolves with a link preview if generated
   */
  _getLinkPreview(url, offset = 0) {
    let openGraphData;

    return new Promise(resolve => {
      if (isBlacklisted(url)) {
        throw new z.error.LinkPreviewError(z.error.LinkPreviewError.TYPE.BLACKLISTED);
      }

      resolve(this._fetchOpenGraphData(url));
    })
      .then(fetchedData => {
        if (fetchedData) {
          openGraphData = fetchedData;
          return buildFromOpenGraphData(openGraphData, url, offset);
        }
        throw new z.error.LinkPreviewError(z.error.LinkPreviewError.TYPE.NO_DATA_AVAILABLE);
      })
      .then(linkPreview => {
        if (linkPreview) {
          return this._fetchPreviewImage(linkPreview, openGraphData.image);
        }
        throw new z.error.LinkPreviewError(z.error.LinkPreviewError.TYPE.UNSUPPORTED_TYPE);
      });
  }

  /**
   * Update the send link preview preference
   * @param {boolean} sendPreviewsPreference - Updated preference
   * @returns {undefined} No return value
   */
  updatedSendPreference(sendPreviewsPreference) {
    this.shouldSendPreviews = sendPreviewsPreference;
  }

  /**
   * Fetch and upload open graph images.
   *
   * @private
   * @param {LinkPreview} linkPreview - Link preview proto message
   * @param {Object} [openGraphImage={}] - Open graph image URL
   * @returns {Promise} Resolves with the link preview proto message
   */
  _fetchPreviewImage(linkPreview, openGraphImage = {}) {
    if (openGraphImage.data) {
      return this._uploadPreviewImage(openGraphImage.data)
        .then(asset => {
          linkPreview.article[PROTO_MESSAGE_TYPE.LINK_PREVIEW_IMAGE] = asset; // deprecated
          linkPreview[PROTO_MESSAGE_TYPE.LINK_PREVIEW_IMAGE] = asset;
          return linkPreview;
        })
        .catch(error => {
          this.logger.error(error);
          return linkPreview;
        });
    }

    return Promise.resolve(linkPreview);
  }

  /**
   * Fetch open graph data.
   *
   * @private
   * @param {string} link - Link to fetch open graph data from
   * @returns {Promise<OpenGraphData | Error>} Resolves with the retrieved open graph data
   */
  async _fetchOpenGraphData(link) {
    try {
      const data = await window.openGraphAsync(link);
      if (data) {
        return Object.entries(data).reduce((result, [key, value]) => {
          result[key] = Array.isArray(value) ? value[0] : value;
          return result;
        }, {});
      }
    } catch (error) {
      this.logger.warn(`Error while fetching OpenGraph data: ${error.message}`);
      return error;
    }
  }

  /**
   * Upload open graph image as asset
   *
   * @private
   * @param {string} dataUri - image data as base64 encoded data URI
   * @returns {Promise} Resolves with the uploaded asset
   */
  async _uploadPreviewImage(dataUri) {
    const blob = await base64ToBlob(dataUri);
    return this.assetService.uploadImageAsset(blob, {public: true});
  }
}

export {LinkPreviewRepository};
