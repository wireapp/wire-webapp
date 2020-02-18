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

import {AxiosRequestConfig} from 'axios';

import {GiphySearch, GiphyResult, GiphySearchResult} from '../giphy/';
import {HttpClient} from '../http/';

export class GiphyAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    GIPHY: 'giphy/v1/gifs',
    PROXY: '/proxy',
    RANDOM: 'random',
    SEARCH: 'search',
  };

  /**
   * Get a Giphy image by its ID.
   * @param ids one or multiple image ID(s)
   */
  public async getGiphyById(ids: string | string[]): Promise<GiphyResult> {
    const allIds = Array<string>().concat(ids);
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${GiphyAPI.URL.PROXY}/${GiphyAPI.URL.GIPHY}/${allIds.join(',')}`,
    };

    const response = await this.client.sendJSON<GiphyResult>(config);
    return response.data;
  }

  /**
   * Get a random GIF from Giphy.
   * @param tag GIF tag to limit randomness
   */
  public async getGiphyRandom(tag?: string): Promise<GiphyResult> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {
        tag,
      },
      url: `${GiphyAPI.URL.PROXY}/${GiphyAPI.URL.GIPHY}/${GiphyAPI.URL.RANDOM}`,
    };

    const response = await this.client.sendJSON<GiphyResult>(config);
    return response.data;
  }

  /**
   * Get GIF search results from Giphy.
   * @param options Search options
   */
  public async getGiphySearch(options: GiphySearch): Promise<GiphySearchResult> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: options,
      url: `${GiphyAPI.URL.PROXY}/${GiphyAPI.URL.GIPHY}/${GiphyAPI.URL.SEARCH}`,
    };

    const response = await this.client.sendJSON<GiphySearchResult>(config);
    return response.data;
  }
}
