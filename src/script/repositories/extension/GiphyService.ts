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

import type {
  GiphySearchOptions,
  GiphyMultipleResult,
  GiphyResult,
  GiphyTrendingOptions,
} from '@wireapp/api-client/lib/giphy';
import {container} from 'tsyringe';

import {APIClient} from '../../service/APIClientSingleton';

export class GiphyService {
  constructor(private readonly apiClient = container.resolve(APIClient)) {}

  /**
   * Get GIFs for an ID
   * @param ids A single id to fetch GIF data
   */
  getById(id: string): Promise<GiphyResult> {
    return this.apiClient.api.giphy.getGiphyById(id);
  }

  /**
   * Get GIFs for IDs
   * @param ids Multiple IDs to fetch GIF data
   */
  getByIds(ids: string[]): Promise<GiphyMultipleResult> {
    return this.apiClient.api.giphy.getGiphyByIds({ids});
  }

  /**
   * Get a random Giphy GIF.
   * @param tag GIF tag to limit randomness by
   */
  getRandom(tag: string): Promise<GiphyResult> {
    return this.apiClient.api.giphy.getGiphyRandom({tag});
  }

  /**
   * Search GIFs for a word or phrase.
   */
  getSearch(options: GiphySearchOptions): Promise<GiphyMultipleResult> {
    return this.apiClient.api.giphy.getGiphySearch(options);
  }

  /**
   * Search GIFs for a word or phrase.
   */
  getTrending(options: GiphyTrendingOptions): Promise<GiphyMultipleResult> {
    return this.apiClient.api.giphy.getGiphyTrending(options);
  }
}
