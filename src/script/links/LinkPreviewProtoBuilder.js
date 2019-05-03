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

import {Article, LinkPreview, Tweet} from '@wireapp/protocol-messaging';

import {truncate} from 'Util/StringUtil';
import {isTweetUrl} from 'Util/ValidationUtil';
import {PROTO_MESSAGE_TYPE} from '../cryptography/ProtoMessageType';

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
   * @returns {LinkPreview} Link preview proto
   */
  buildFromOpenGraphData(data, url, offset = 0) {
    if (!_.isEmpty(data)) {
      data.url = data.url || url;

      if (data.title && data.url) {
        const {description = '', title = '', url: dataUrl} = data;

        const truncatedDescription = truncate(description, z.config.MAXIMUM_LINK_PREVIEW_CHARS);
        const truncatedTitle = truncate(title, z.config.MAXIMUM_LINK_PREVIEW_CHARS);

        const protoArticle = new Article({permanentUrl: dataUrl, summary: truncatedDescription, title: truncatedTitle}); // deprecated format
        const protoLinkPreview = new LinkPreview({
          article: protoArticle,
          permanentUrl: dataUrl,
          summary: truncatedDescription,
          title: truncatedTitle,
          url: url,
          urlOffset: offset,
        });

        if (data.site_name === 'Twitter' && isTweetUrl(data.url)) {
          const author = data.title.replace('on Twitter', '').trim();
          const username = data.url.match(/com\/([^/]*)\//)[1];
          const protoTweet = new Tweet({author, username});

          protoLinkPreview[PROTO_MESSAGE_TYPE.TWEET] = protoTweet;
          protoLinkPreview[PROTO_MESSAGE_TYPE.LINK_PREVIEW_TITLE] = truncatedDescription;
        }

        return protoLinkPreview;
      }
    }
  },
};
