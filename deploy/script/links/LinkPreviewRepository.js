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

'use strict';

window.z = window.z || {};
window.z.links = z.links || {};

z.links.LinkPreviewRepository = class LinkPreviewRepository {
  constructor(assetService, propertiesRepository) {
    this.getLinkPreviewFromString = this.getLinkPreviewFromString.bind(this);
    this.updatedSendPreference = this.updatedSendPreference.bind(this);

    this.assetService = assetService;
    this.logger = new z.util.Logger('z.links.LinkPreviewRepository', z.config.LOGGER.OPTIONS);

    this.shouldSendPreviews = propertiesRepository.getPreference(z.properties.PROPERTIES_TYPE.PREVIEWS.SEND);

    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.PREVIEWS.SEND, this.updatedSendPreference);
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, properties => {
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
    if (this.shouldSendPreviews && z.util.Environment.desktop) {
      return Promise.resolve().then(() => {
        const linkData = z.links.LinkPreviewHelpers.getFirstLinkWithOffset(string);

        if (linkData) {
          return this.getLinkPreview(linkData.url, linkData.offset).catch(error => {
            const isLinkPreviewError = error instanceof z.error.LinkPreviewError;
            if (!isLinkPreviewError) {
              throw error;
            }
          });
        }
      });
    }
    return Promise.resolve();
  }

  /**
   * Creates link preview for given link. This will upload associated image as asset and will
   * resolve with an z.proto.LinkPreview instance
   *
   * @param {string} url - URL found to generate link preview from
   * @param {number} [offset=0] - starting index of the link
   * @returns {Promise} Resolves with a link preview if generated
   */
  getLinkPreview(url, offset = 0) {
    let openGraphData;

    return Promise.resolve()
      .then(() => {
        if (z.links.LinkPreviewBlackList.isBlacklisted(url)) {
          throw new z.error.LinkPreviewError(z.error.LinkPreviewError.TYPE.BLACKLISTED);
        }

        if (window.openGraph) {
          return this._fetchOpenGraphData(url);
        }

        throw new z.error.LinkPreviewError(z.error.LinkPreviewError.TYPE.NOT_SUPPORTED);
      })
      .then(fetchedData => {
        if (fetchedData) {
          openGraphData = fetchedData;
          return z.links.LinkPreviewProtoBuilder.buildFromOpenGraphData(openGraphData, url, offset);
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
   * @param {z.proto.LinkPreview} linkPreview - Link preview proto message
   * @param {Object} [openGraphImage={}] - Open graph image URL
   * @returns {Promise} Resolves with the link preview proto message
   */
  _fetchPreviewImage(linkPreview, openGraphImage = {}) {
    if (openGraphImage.data) {
      return this._uploadPreviewImage(openGraphImage.data)
        .then(asset => {
          linkPreview.article.set(z.cryptography.PROTO_MESSAGE_TYPE.LINK_PREVIEW_IMAGE, asset); // deprecated
          linkPreview.image.set(z.cryptography.PROTO_MESSAGE_TYPE.LINK_PREVIEW_IMAGE, asset);
          return linkPreview;
        })
        .catch(() => linkPreview);
    }

    return Promise.resolve(linkPreview);
  }

  /**
   * Fetch open graph data.
   *
   * @private
   * @param {string} link - Link to fetch open graph data from
   * @returns {Promise} Resolves with the retrieved open graph data
   */
  _fetchOpenGraphData(link) {
    return new Promise(resolve => {
      return window
        .openGraph(link, (error, data) => {
          if (error) {
            resolve();
          }

          if (data) {
            data = Object.entries(data).reduce((filteredData, [key, value]) => {
              filteredData[key] = Array.isArray(value) ? value[0] : value;
              return filteredData;
            }, {});
          }

          resolve(data);
        })
        .catch(resolve);
    });
  }

  /**
   * Upload open graph image as asset
   *
   * @private
   * @param {string} dataUri - image data as base64 encoded data URI
   * @returns {Promise} Resolves with the uploaded asset
   */
  _uploadPreviewImage(dataUri) {
    return Promise.resolve(z.util.base64ToBlob(dataUri)).then(blob =>
      this.assetService.uploadImageAsset(blob, {public: true})
    );
  }
};
