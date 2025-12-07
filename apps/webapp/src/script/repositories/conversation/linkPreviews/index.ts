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

import type {Data as OpenGraphResult} from 'open-graph';
import {deArrayify} from 'Util/ArrayUtil';
import {getLogger} from 'Util/Logger';
import {truncate} from 'Util/StringUtil';
import {base64ToArray, getContentTypeFromDataUrl} from 'Util/util';
import {isTweetUrl} from 'Util/ValidationUtil';

import {isBlacklisted} from './blackList';
import {getFirstLinkWithOffset} from './helpers';
import {LinkPreviewError} from './LinkPreviewError';

import {Config} from '../../../Config';

type LinkPreviewContent = {
  image?: {
    data: Uint8Array;
    height: number;
    type: string;
    width: number;
  };
  permanantUrl: string;
  title: string;
  tweet?: {
    author?: string;
    username?: string;
  };
  url: string;
  urlOffset: number;
};

declare global {
  interface Window {
    openGraphAsync?: (url: string) => Promise<OpenGraphResult>;
    desktopAppConfig?: {version: string; supportsCallingPopoutWindow?: boolean};
  }
}
const logger = getLogger('LinkPreviewRepository');

/**
 * Searches for URL in given string and creates a link preview.
 *
 * @param string Input text to generate preview for
 * @returns Resolves with link preview details
 */
export async function getLinkPreviewFromString(string: string): Promise<LinkPreviewContent | undefined> {
  if (!window.openGraphAsync) {
    return undefined;
  }

  const linkData = getFirstLinkWithOffset(string);
  if (!linkData) {
    return undefined;
  }

  try {
    return await getLinkPreview(linkData.url, linkData.offset);
  } catch (error) {
    const isLinkPreviewError = error instanceof LinkPreviewError;
    if (!isLinkPreviewError) {
      throw error;
    }
  }
  return undefined;
}

/**
 * Creates link preview for given link. This will upload associated image as asset and will
 * resolve with a LinkPreview instance
 *
 * @param url URL found to generate link preview from
 * @param offset starting index of the link
 * @returns Resolves with a link preview if generated
 */
async function getLinkPreview(url: string, offset: number = 0): Promise<LinkPreviewContent | undefined> {
  if (isBlacklisted(url)) {
    throw new LinkPreviewError(LinkPreviewError.TYPE.BLACKLISTED, LinkPreviewError.MESSAGE.BLACKLISTED);
  }

  const openGraphData = await fetchOpenGraphData(url);
  if (!openGraphData) {
    throw new LinkPreviewError(LinkPreviewError.TYPE.NO_DATA_AVAILABLE, LinkPreviewError.MESSAGE.NO_DATA_AVAILABLE);
  }
  return toLinkPreviewData(openGraphData, url, offset);
}

function toLinkPreviewData(openGraphData: OpenGraphResult, url: string, offset: number): LinkPreviewContent {
  const base64Image = (openGraphData.image as {data: string})?.data;
  const image = base64Image
    ? {
        data: base64ToArray(base64Image),
        height: 0,
        type: getContentTypeFromDataUrl(base64Image),
        width: 0,
      }
    : undefined;

  const {site_name, title, description} = openGraphData;

  const truncatedTitle = truncate(deArrayify(title), Config.getConfig().MAXIMUM_LINK_PREVIEW_CHARS);
  const truncatedDescription = truncate(deArrayify(description ?? ''), Config.getConfig().MAXIMUM_LINK_PREVIEW_CHARS);

  let tweet;
  if (deArrayify(site_name) === 'Twitter' && isTweetUrl(deArrayify(url))) {
    const author = deArrayify(title).replace('on Twitter', '').trim();
    const username = deArrayify(url).match(/com\/([^/]*)\//)?.[1];
    tweet = {
      author,
      username,
    };
  }

  return {
    image,
    permanantUrl: deArrayify(openGraphData.url) ?? '',
    title: tweet ? truncatedDescription : truncatedTitle,
    tweet,
    url,
    urlOffset: offset,
  };
}

/**
 * Fetch open graph data.
 *
 * @param link Link to fetch open graph data from
 * @returns Resolves with the retrieved open graph data
 */
async function fetchOpenGraphData(link: string): Promise<OpenGraphResult | undefined> {
  try {
    const data = await window.openGraphAsync?.(link);
    if (data) {
      return Object.entries(data).reduce((result, [key, value]) => {
        result[key] = Array.isArray(value) ? value[0] : value;
        return result;
      }, {} as OpenGraphResult);
    }
    return undefined;
  } catch (error) {
    if (error instanceof Error) {
      logger.warn(`Error while fetching OpenGraph data: ${error.message}`);
    }
    throw new LinkPreviewError(LinkPreviewError.TYPE.UNSUPPORTED_TYPE, LinkPreviewError.MESSAGE.UNSUPPORTED_TYPE);
  }
}
