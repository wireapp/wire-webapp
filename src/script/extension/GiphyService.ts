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

import {BackendClient} from '../service/BackendClient';
import {GiphyGif, GiphyResult} from './GiphyResult';

export enum GiphySorting {
  RECENT = 'recent',
  RELEVANT = 'relevant',
}

export interface GiphySearchOptions {
  /** Search query term or phrase */
  q: string;
  /** Number of results to return (maximum 100). Default is 25. */
  limit?: number;
  /** Results offset. Default is 0. */
  offset?: number;
  /** Specify sorting ('relevant' or 'recent'). Default is "relevant". */
  sort?: GiphySorting;
}

export class GiphyService {
  private readonly backendClient: BackendClient;

  static CONFIG = {
    ENDPOINT_BASE: '/proxy/giphy/v1/gifs',
  };

  /**
   * @param backendClient - Client for the API calls
   */
  constructor(backendClient: BackendClient) {
    this.backendClient = backendClient;
  }

  /**
   * Get GIFs for IDs.
   * @param ids - A single id or comma separated list of IDs to fetch GIF size data
   * @returns Resolves with the size data
   */
  getById(ids: string | string[]): Promise<GiphyResult<GiphyGif>> {
    ids = [].concat(ids);

    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${GiphyService.CONFIG.ENDPOINT_BASE}/${ids.join(',')}`,
    });
  }

  /**
   * Search all Giphy GIFs for a word or phrase.
   * @param tag - GIF tag to limit randomness by
   * @returns Resolves with random gifs for given tag
   */
  getRandom(tag: string): Promise<GiphyResult<GiphyGif>> {
    return this.backendClient.sendRequest({
      data: {
        tag,
      },
      type: 'GET',
      url: `${GiphyService.CONFIG.ENDPOINT_BASE}/random`,
    });
  }

  /**
   * Search GIFs for a word or phrase.
   * @returns Resolves with matches
   */
  getSearch(options: GiphySearchOptions): Promise<GiphyResult<GiphyGif[]>> {
    return this.backendClient.sendRequest({
      data: {
        limit: 25,
        offset: 0,
        sort: GiphySorting.RELEVANT,
        ...options,
      },
      type: 'GET',
      url: `${GiphyService.CONFIG.ENDPOINT_BASE}/search`,
    });
  }
}
