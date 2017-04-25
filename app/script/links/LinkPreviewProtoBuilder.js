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

z.links.LinkPreviewProtoBuilder = {

  /*
  Create Protocol Buffers message for link previews.
  Open Graph data can be validated through: https://developers.facebook.com/tools/debug/

  @param {Object} data - open graph data
  @param {string} url - link entered by the user
  @param {number} offset - starting index of the link

  @returns {z.proto.LinkPreview}
  */
  build_from_open_graph_data(data, url, offset = 0) {
    if (_.isEmpty(data)) {
      return;
    }

    data.url = data.url || url;

    if (data.title && data.url) {
      const article = new z.proto.Article(data.url, data.title, data.description); // deprecated format
      const preview = new z.proto.LinkPreview(url, offset, article, data.url, data.title, data.description);

      if (data.site_name === 'Twitter') {
        const author = data.title.replace('on Twitter', '').trim();
        const username = data.url.match(/com\/([^/]*)\//)[1];
        const tweet = new z.proto.Tweet(author, username);
        preview.set('tweet', tweet);
        preview.set('title', data.description);
      }

      return preview;
    }
  },

};
