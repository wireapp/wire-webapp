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

import {base64ToArray, getContentTypeFromDataUrl} from 'Util/util';
import {getLogger} from 'Util/Logger';

import {getFirstLinkWithOffset} from './helpers';
import {isBlacklisted} from './blackList';
import {LinkPreviewError} from './LinkPreviewError';

type LinkPreviewContent = {
  image: {
    data: Uint8Array;
    height: number;
    type: string;
    width: number;
  };
  title: string;
  url: string;
  urlOffset: number;
};

declare global {
  interface Window {
    openGraphAsync?: (url: string) => Promise<OpenGraphResult>;
  }
}
const logger = getLogger('LinkPreviewRepository');

/**
 * Searches for URL in given string and creates a link preview.
 *
 * @param string Input text to generate preview for
 * @returns Resolves with link preview details
 */
export async function getLinkPreviewFromString(string: string): Promise<LinkPreviewContent | void> {
  if (!window.openGraphAsync) {
    return;
  }

  const linkData = getFirstLinkWithOffset(string);
  if (!linkData) {
    return;
  }

  try {
    return await getLinkPreview(linkData.url, linkData.offset);
  } catch (error) {
    const isLinkPreviewError = error instanceof LinkPreviewError;
    if (!isLinkPreviewError) {
      throw error;
    }
  }
}

/**
 * Creates link preview for given link. This will upload associated image as asset and will
 * resolve with a LinkPreview instance
 *
 * @param url URL found to generate link preview from
 * @param offset starting index of the link
 * @returns Resolves with a link preview if generated
 */
async function getLinkPreview(url: string, offset: number = 0): Promise<LinkPreviewContent | void> {
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
  const base64Image = (openGraphData.image as {data: string}).data;
  const mimeType = getContentTypeFromDataUrl(base64Image);
  const bytes = base64ToArray(base64Image);
  return {
    image: {
      data: bytes,
      height: 0,
      type: mimeType,
      width: 0,
    },
    title: Array.isArray(openGraphData.title) ? openGraphData.title[0] : openGraphData.title,
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
    logger.warn(`Error while fetching OpenGraph data: ${error.message}`);
    throw new LinkPreviewError(LinkPreviewError.TYPE.UNSUPPORTED_TYPE, LinkPreviewError.MESSAGE.UNSUPPORTED_TYPE);
  }
}
