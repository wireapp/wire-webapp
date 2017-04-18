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

const GIPHY_SERVICE_CONFIG = {
  ENDPOINT_BASE: '/giphy/v1/gifs',
};

z.extension.GiphyService = class GiphyService {
  /**
   * Construct a new Giphy Service.
   * @param {z.service.Client} client - Client for the API calls
   * @returns {GiphyService} Service for all giphy calls to the backend REST API.
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
    ids = _.isArray(ids) ? ids : [ids];

    return this.client.send_json({
      type: 'GET',
      url: this.client.create_url(`${GIPHY_SERVICE_CONFIG.ENDPOINT_BASE}/${ids.join(',')}`),
    });
  }

  /**
   * Search all Giphy GIFs for a word or phrase.
   * @param {String} tag - GIF tag to limit randomness by
   * @returns {Promise} Resolves with random gifs for given tag
   */
  get_random(tag) {
    return this.client.send_json({
      type: 'GET',
      url: this.client.create_url(`${GIPHY_SERVICE_CONFIG.ENDPOINT_BASE}/random?tag=${encodeURIComponent(tag)}`),
    });
  }

  /**
   * Search GIFs for a word or phrase.
   *
   * @param {Object} options - Search options
   * @param {string} options.query - Search query term or phrase
   * @param {Number} [options.limit=25] - Number of results to return (maximum 100)
   * @param {Number} [options.offset=0] - Results offset
   * @param {string} [options.sorting='recent'] - Specify sorting ('relevant' or 'recent')
   * @returns {Promise} Resolves with matches
   */
  get_search(options) {
    options = $.extend({
      limit: 25,
      offset: 0,
      sorting: 'relevant',
    }
    , options);

    const url = `${GIPHY_SERVICE_CONFIG.ENDPOINT_BASE}/search` +
      `?q=${encodeURIComponent(options.query)}` +
      `&offset=${options.offset}` +
      `&limit=${options.limit}` +
      `&sort=${options.sorting}`;

    return this.client.send_json({
      type: 'GET',
      url: this.client.create_url(url),
    });
  }
};
