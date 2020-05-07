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
import {
  GiphySearchOptions,
  GiphyMultipleResult,
  GiphyResult,
  GiphyTrendingOptions,
} from '@wireapp/api-client/dist/giphy';

export class GiphyService {
  private readonly apiClient: APIClient;

  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
  }

  /**
   * Get GIFs for an ID
   * @param ids A single id to fetch GIF data
   */
  getById(id: string): Promise<GiphyResult> {
    return this.apiClient.giphy.api.getGiphyById(id);
  }

  /**
   * Get GIFs for IDs
   * @param ids Multiple IDs to fetch GIF data
   */
  getByIds(ids: string[]): Promise<GiphyMultipleResult> {
    return this.apiClient.giphy.api.getGiphyByIds({ids});
  }

  /**
   * Get a randomg Giphy GIFs.
   * @param tag GIF tag to limit randomness by
   */
  getRandom(tag: string): Promise<GiphyResult> {
    return this.apiClient.giphy.api.getGiphyRandom(tag);
  }

  /**
   * Search GIFs for a word or phrase.
   */
  getSearch(options: GiphySearchOptions): Promise<GiphyMultipleResult> {
    return this.apiClient.giphy.api.getGiphySearch(options);
  }

  /**
   * Search GIFs for a word or phrase.
   */
  getTrending(options: GiphyTrendingOptions): Promise<GiphyMultipleResult> {
    return this.apiClient.giphy.api.getGiphyTrending(options);
  }
}
