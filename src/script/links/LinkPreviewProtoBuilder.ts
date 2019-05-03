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
import {Data as OpenGraphData} from 'open-graph';
import {isEmpty} from 'underscore';

import {deArrify} from 'Util/ArrayUtil';
import {truncate} from 'Util/StringUtil';
import {isTweetUrl} from 'Util/ValidationUtil';

import {config} from '../config';
import {PROTO_MESSAGE_TYPE} from '../cryptography/ProtoMessageType';

/**
 * Create Protocol Buffers message for link previews.
 * Open Graph data can be validated through: https://developers.facebook.com/tools/debug/
 *
 * @param data Open graph data
 * @param url Link entered by the user
 * @param offset Starting index of the link
 */
export const buildFromOpenGraphData = (data: OpenGraphData, url: string, offset = 0): LinkPreview | void => {
  if (isEmpty(data)) {
    return;
  }

  const {description, site_name, title, url: dataUrl} = data;

  if (!data.title || !data.url) {
    return;
  }

  const truncatedDescription = truncate(deArrify(description), config.MAXIMUM_LINK_PREVIEW_CHARS);
  const truncatedTitle = truncate(deArrify(title), config.MAXIMUM_LINK_PREVIEW_CHARS);

  const protoArticle = new Article({
    permanentUrl: deArrify(dataUrl),
    summary: truncatedDescription,
    title: truncatedTitle,
  }); // deprecated format
  const protoLinkPreview = new LinkPreview({
    article: protoArticle,
    permanentUrl: deArrify(dataUrl),
    summary: truncatedDescription,
    title: truncatedTitle,
    url: url,
    urlOffset: offset,
  });

  if (site_name === 'Twitter' && isTweetUrl(deArrify(dataUrl))) {
    const author = deArrify(title)
      .replace('on Twitter', '')
      .trim();
    const username = deArrify(dataUrl).match(/com\/([^/]*)\//)[1];
    const protoTweet = new Tweet({author, username});

    protoLinkPreview[PROTO_MESSAGE_TYPE.TWEET] = protoTweet;
    protoLinkPreview[PROTO_MESSAGE_TYPE.LINK_PREVIEW_TITLE] = truncatedDescription;
  }

  return protoLinkPreview;
};
