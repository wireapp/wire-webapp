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

import {APIClient} from '@wireapp/api-client';
import {GiphySearch, GiphyResult, GiphySearchResult} from '@wireapp/api-client/dist/giphy';

export class GiphyService {
  private readonly apiClient: APIClient;

  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
  }

  /**
   * Get GIFs for IDs.
   * @param ids A single id or comma separated list of IDs to fetch GIF size data
   * @returns Resolves with the size data
   */
  getById(ids: string | string[]): Promise<GiphyResult> {
    return this.apiClient.giphy.api.getGiphyById(ids);
  }

  /**
   * Search all Giphy GIFs for a word or phrase.
   * @param tag GIF tag to limit randomness by
   * @returns Resolves with random gifs for given tag
   */
  getRandom(tag: string): Promise<GiphyResult> {
    return this.apiClient.giphy.api.getGiphyRandom(tag);
  }

  /**
   * Search GIFs for a word or phrase.
   * @returns Resolves with matches
   */
  getSearch(options: GiphySearch): Promise<GiphySearchResult> {
    return this.apiClient.giphy.api.getGiphySearch(options);
  }
}
