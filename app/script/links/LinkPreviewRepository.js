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
  constructor(asset_service) {
    this.get_link_preview_from_string = this.get_link_preview_from_string.bind(this);
    this.asset_service = asset_service;
    this.logger = new z.util.Logger('z.links.LinkPreviewRepository', z.config.LOGGER.OPTIONS);
  }

  /*
  Searches for url in given string and creates a link preview.
  This will upload associated image as asset and will resolve with an z.proto.LinkPreview instance

  @param {string} string
  */
  get_link_preview_from_string(string) {
    return Promise.resolve()
    .then(() => {
      const data = z.links.LinkPreviewHelpers.get_first_link_with_offset(string);

      if (data) {
        const [url, offset] = data;
        return this.get_link_preview(url, offset)
        .catch(function(error) {
          if (!(error instanceof z.links.LinkPreviewError)) {
            throw error;
          }
        });
      }
    });
  }

  /*
  Creates link preview for given link. This will upload associated image as asset and will
  resolve with an z.proto.LinkPreview instance

  @param {string} url
  @param {number} [offset=0] - starting index of the link
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
    .then((data) => {
      open_graph_data = data;
      if (open_graph_data) {
        return z.links.LinkPreviewProtoBuilder.build_from_open_graph_data(open_graph_data, url, offset);
      }
      throw new z.links.LinkPreviewError(z.links.LinkPreviewError.TYPE.NO_DATA_AVAILABLE);
    })
    .then(function(link_preview) {
      if (link_preview != null) {
        return link_preview;
      }
      throw new z.links.LinkPreviewError(z.links.LinkPreviewError.TYPE.UNSUPPORTED_TYPE);
    })
    .then(link_preview => this._fetch_preview_image(link_preview, open_graph_data.image));
  }

  /*
  Fetch and upload open graph images

  @param {z.proto.LinkPreview} link_preview
  @param {Object} [open_graph_image={}]
  */
  _fetch_preview_image(link_preview, open_graph_image = {}) {
    if (open_graph_image.data) {
      return this._upload_preview_image(open_graph_image.data)
        .then((asset) => {
          link_preview.article.set('image', asset); // deprecated
          link_preview.image.set('image', asset);
          return link_preview;
        })
        .catch(() => link_preview);
    }
    return link_preview;
  }

  /*
  Fetch open graph data

  @param {string} url
  */
  _fetch_open_graph_data(link) {
    return new Promise((resolve) => {
      return window.openGraph(link, (error, data) => resolve(error ? null : data));
    });
  }

  /*
  Upload open graph image as asset

  @param {string} data_URI - image data as base64 encoded data URI
  */
  _upload_preview_image(data_URI) {
    return Promise.resolve(z.util.base64_to_blob(data_URI))
    .then(blob => this.asset_service.upload_image_asset(blob, {public: true}));
  }
};
