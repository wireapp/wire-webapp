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

'use strict';

window.z = window.z || {};
window.z.extension = z.extension || {};

z.extension.GiphyService = class GiphyService {
  static get CONFIG() {
    return {
      ENDPOINT_BASE: '/proxy/giphy/v1/gifs',
    };
  }

  /**
   * Construct a new Giphy Service.
   * @param {z.service.BackendClient} backendClient - Client for the API calls
   */
  constructor(backendClient) {
    this.backendClient = backendClient;
  }

  /**
   * Get GIFs for IDs.
   * @param {string|Array} ids - A single id or comma separated list of IDs to fetch GIF size data
   * @returns {Promise} Resolves with the size data
   */
  getById(ids) {
    ids = [].concat(ids);

    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${GiphyService.CONFIG.ENDPOINT_BASE}/${ids.join(',')}`,
    });
  }

  /**
   * Search all Giphy GIFs for a word or phrase.
   * @param {string} tag - GIF tag to limit randomness by
   * @returns {Promise} Resolves with random gifs for given tag
   */
  getRandom(tag) {
    return this.backendClient.sendRequest({
      data: {
        tag: tag,
      },
      type: 'GET',
      url: `${GiphyService.CONFIG.ENDPOINT_BASE}/random`,
    });
  }

  /**
   * Search GIFs for a word or phrase.
   *
   * @param {Object} options - Search options
   * @param {string} options.q - Search query term or phrase
   * @param {number} [options.limit=25] - Number of results to return (maximum 100)
   * @param {number} [options.offset=0] - Results offset
   * @param {string} [options.sorting='relevant'] - Specify sorting ('relevant' or 'recent')
   * @returns {Promise} Resolves with matches
   */
  getSearch(options) {
    return this.backendClient.sendRequest({
      data: Object.assign(
        {
          limit: 25,
          offset: 0,
          sort: 'relevant',
        },
        options
      ),
      type: 'GET',
      url: `${GiphyService.CONFIG.ENDPOINT_BASE}/search`,
    });
  }
};
