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

window.z = window.z || {};
window.z.links = z.links || {};

z.links.LinkPreviewProtoBuilder = {
  /**
   * Create Protocol Buffers message for link previews.
   * Open Graph data can be validated through: https://developers.facebook.com/tools/debug/
   *
   * @param {Object} data - Open graph data
   * @param {string} url - Link entered by the user
   * @param {number} offset - Starting index of the link
   *
   * @returns {z.proto.LinkPreview} Link preview proto
   */
  buildFromOpenGraphData(data, url, offset = 0) {
    if (!_.isEmpty(data)) {
      data.url = data.url || url;

      if (data.title && data.url) {
        const protoArticle = new z.proto.Article(data.url, data.title, data.description); // deprecated format

        const {description, title, url: dataUrl} = data;
        const protoLinkPreview = new z.proto.LinkPreview(url, offset, protoArticle, dataUrl, title, description);

        if (data.site_name === 'Twitter' && z.util.ValidationUtil.urls.isTweet(data.url)) {
          const author = data.title.replace('on Twitter', '').trim();
          const username = data.url.match(/com\/([^/]*)\//)[1];
          const protoTweet = new z.proto.Tweet(author, username);

          protoLinkPreview.set(z.cryptography.PROTO_MESSAGE_TYPE.TWEET, protoTweet);
          protoLinkPreview.set(z.cryptography.PROTO_MESSAGE_TYPE.LINK_PREVIEW_TITLE, data.description);
        }

        return protoLinkPreview;
      }
    }
  },
};
