/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
  constructor(asset_service, properties_repository) {
    this.get_link_preview_from_string = this.get_link_preview_from_string.bind(this);
    this.updated_send_preference = this.updated_send_preference.bind(this);

    this.asset_service = asset_service;
    this.logger = new z.util.Logger('z.links.LinkPreviewRepository', z.config.LOGGER.OPTIONS);

    this.should_send_previews = properties_repository.get_preference(z.properties.PROPERTIES_TYPE.PREVIEWS.SEND);

    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.PREVIEWS.SEND, this.updated_send_preference);
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, properties => {
      this.updated_send_preference(properties.settings.previews.send);
    });
  }

  /**
   * Searches for url in given string and creates a link preview.
   *
   * @note This will already upload the associated image as asset
   * @param {string} string - Input text to generate preview for
   * @returns {Promise} Resolves with link preview proto message
   */
  get_link_preview_from_string(string) {
    if (this.should_send_previews && z.util.Environment.desktop) {
      return Promise.resolve().then(() => {
        const data = z.links.LinkPreviewHelpers.get_first_link_with_offset(string);

        if (data) {
          return this.get_link_preview(data.url, data.offset).catch(error => {
            if (!(error instanceof z.links.LinkPreviewError)) {
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
  get_link_preview(url, offset = 0) {
    let open_graph_data;

    return Promise.resolve()
      .then(() => {
        if (z.links.LinkPreviewBlackList.is_blacklisted(url)) {
          throw new z.links.LinkPreviewError(z.links.LinkPreviewError.TYPE.BLACKLISTED);
        }
        if (window.openGraph) {
          return this._fetch_open_graph_data(url);
        }
        throw new z.links.LinkPreviewError(z.links.LinkPreviewError.TYPE.NOT_SUPPORTED);
      })
      .then(data => {
        open_graph_data = data;
        if (open_graph_data) {
          return z.links.LinkPreviewProtoBuilder.build_from_open_graph_data(open_graph_data, url, offset);
        }
        throw new z.links.LinkPreviewError(z.links.LinkPreviewError.TYPE.NO_DATA_AVAILABLE);
      })
      .then(link_preview => {
        if (link_preview) {
          return this._fetch_preview_image(link_preview, open_graph_data.image);
        }
        throw new z.links.LinkPreviewError(z.links.LinkPreviewError.TYPE.UNSUPPORTED_TYPE);
      });
  }

  /**
   * Update the send link preview preference
   * @param {boolean} previews_send_preference - Updated preference
   * @returns {undefined} No return value
   */
  updated_send_preference(previews_send_preference) {
    this.should_send_previews = previews_send_preference;
  }

  /**
   * Fetch and upload open graph images.
   *
   * @private
   * @param {z.proto.LinkPreview} link_preview - Link preview proto message
   * @param {Object} [open_graph_image={}] - Open graph image URL
   * @returns {Promise} Resolves with the link preview proto message
   */
  _fetch_preview_image(link_preview, open_graph_image = {}) {
    if (open_graph_image.data) {
      return this._upload_preview_image(open_graph_image.data)
        .then(asset => {
          link_preview.article.set('image', asset); // deprecated
          link_preview.image.set('image', asset);
          return link_preview;
        })
        .catch(() => link_preview);
    }
    return Promise.resolve(link_preview);
  }

  /**
   * Fetch open graph data.
   *
   * @private
   * @param {string} link - Link to fetch open graph data from
   * @returns {Promise} Resolves with the retrieved open graph data
   */
  _fetch_open_graph_data(link) {
    return new Promise(resolve => {
      return window.openGraph(link, (error, data) => {
        if (error) {
          resolve(undefined);
        }

        if (data) {
          data = Object.keys(data).reduce((filtered_data, key) => {
            const value = data[key];
            filtered_data[key] = Array.isArray(value) ? value[0] : value;
            return filtered_data;
          }, {});
        }

        resolve(data);
      });
    });
  }

  /**
   * Upload open graph image as asset
   *
   * @private
   * @param {string} data_URI - image data as base64 encoded data URI
   * @returns {Promise} Resolves with the uploaded asset
   */
  _upload_preview_image(data_URI) {
    return Promise.resolve(z.util.base64_to_blob(data_URI)).then(blob =>
      this.asset_service.uploadImageAsset(blob, {public: true})
    );
  }
};
