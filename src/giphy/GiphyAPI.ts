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

import {GiphySearchOptions, GiphyRandomOptions, GiphyTrendingOptions, GiphyIdOptions} from './GiphyOptions';
import {GiphyResult, GiphyMultipleResult} from './GiphyResult';

import {HttpClient} from '../http/';

export class GiphyAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    GIPHY: 'giphy/v1/gifs',
    PROXY: '/proxy',
    RANDOM: 'random',
    SEARCH: 'search',
    TRENDING: 'trending',
  };

  /**
   * Get multiple Giphy images by IDs.
   * @see https://developers.giphy.com/docs/api/endpoint#get-gifs-by-id
   */
  public async getGiphyByIds(options: GiphyIdOptions): Promise<GiphyMultipleResult> {
    const allIds = options.ids.join(',');
    const optionsWithoutIds = {random_id: options.random_id, rating: options.rating};

    const config: AxiosRequestConfig = {
      method: 'get',
      params: optionsWithoutIds,
      url: `${GiphyAPI.URL.PROXY}/${GiphyAPI.URL.GIPHY}/${allIds}`,
    };

    const response = await this.client.sendJSON<GiphyMultipleResult>(config);
    return response.data;
  }

  /**
   * Get a Giphy image by its ID.
   * @see https://developers.giphy.com/docs/api/endpoint#get-gif-by-id
   */
  public async getGiphyById(id: string): Promise<GiphyResult> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${GiphyAPI.URL.PROXY}/${GiphyAPI.URL.GIPHY}/${id}`,
    };

    const response = await this.client.sendJSON<GiphyMultipleResult>(config);
    return response.data;
  }

  /**
   * Get a random GIF from Giphy.
   * @see https://developers.giphy.com/docs/api/endpoint#random
   */
  public async getGiphyRandom(options?: GiphyRandomOptions): Promise<GiphyResult> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: options,
      url: `${GiphyAPI.URL.PROXY}/${GiphyAPI.URL.GIPHY}/${GiphyAPI.URL.RANDOM}`,
    };

    const response = await this.client.sendJSON<GiphyResult>(config);
    return response.data;
  }

  /**
   * Get GIF search results from Giphy.
   * @see https://developers.giphy.com/docs/api/endpoint#search
   */
  public async getGiphySearch(options: GiphySearchOptions): Promise<GiphyMultipleResult> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: options,
      url: `${GiphyAPI.URL.PROXY}/${GiphyAPI.URL.GIPHY}/${GiphyAPI.URL.SEARCH}`,
    };

    const response = await this.client.sendJSON<GiphyMultipleResult>(config);
    return response.data;
  }

  /**
   * Get GIF trending results from Giphy.
   * @see https://developers.giphy.com/docs/api/endpoint#trending
   */
  public async getGiphyTrending(options: GiphyTrendingOptions): Promise<GiphyMultipleResult> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: options,
      url: `${GiphyAPI.URL.PROXY}/${GiphyAPI.URL.GIPHY}/${GiphyAPI.URL.TRENDING}`,
    };

    const response = await this.client.sendJSON<GiphyMultipleResult>(config);
    return response.data;
  }
}
