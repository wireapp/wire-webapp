/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
      ENDPOINT_BASE: '/giphy/v1/gifs',
      PROXY_BASE: '/proxy/giphy/v1/gifs',
    };
  }

  /**
   * Construct a new Giphy Service.
   * @param {z.service.BackendClient} client - Client for the API calls
   */
  constructor(client) {
    this.client = client;
  }

  /**
   * Get GIFs for IDs.
   * @param {string|Array} ids - A single id or comma separated list of IDs to fetch GIF size data
   * @returns {Promise} Resolves with the size data
   */
  get_by_id(ids) {
    ids = [].concat(ids);

    return this.client.send_request({
      type: 'GET',
      url: this.client.create_url(`${GiphyService.CONFIG.ENDPOINT_BASE}/${ids.join(',')}`),
    });
  }

  /**
   * Search all Giphy GIFs for a word or phrase.
   * @param {string} tag - GIF tag to limit randomness by
   * @returns {Promise} Resolves with random gifs for given tag
   */
  get_random(tag) {
    return this.client.send_request({
      data: {
        tag: tag,
      },
      type: 'GET',
      url: this.client.create_url(`${GiphyService.CONFIG.PROXY_BASE}/random`),
    });
  }

  /**
   * Search GIFs for a word or phrase.
   *
   * @param {Object} options - Search options
   * @param {string} options.q - Search query term or phrase
   * @param {number} [options.limit=25] - Number of results to return (maximum 100)
   * @param {number} [options.offset=0] - Results offset
   * @param {string} [options.sorting='recent'] - Specify sorting ('relevant' or 'recent')
   * @returns {Promise} Resolves with matches
   */
  get_search(options) {
    return this.client.send_request({
      data: Object.assign(
        {
          limit: 25,
          offset: 0,
          sort: 'relevant',
        },
        options
      ),
      type: 'GET',
      url: this.client.create_url(`${GiphyService.CONFIG.ENDPOINT_BASE}/search`),
    });
  }
};
