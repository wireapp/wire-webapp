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
  /*
  Construct a new Giphy Service.
  @param {z.service.Client} client - Client for the API calls
  */
  constructor(client) {
    this.client = client;
    this.GIPHY_ENDPOINT_BASE = '/giphy/v1/gifs';
  }

  /*
  Get GIFs for IDs.
  @param {Array|string} ids - A single id or comma separated list of IDs to fetch GIF size data
  */
  get_by_id(ids) {
    ids = Array.isArray(ids) ? ids : [ids];
    const url = `${this.GIPHY_ENDPOINT_BASE}/${ids.join(',')}`;

    return this.client.send_json({
      type: 'GET',
      url: this.client.create_url(url),
    });
  }

  /*
  Search all Giphy GIFs for a word or phrase.
  @param {string} tag - GIF tag to limit randomness by
  */
  get_random(tag) {
    const url = `${this.GIPHY_ENDPOINT_BASE}/random?tag=${encodeURIComponent(tag)}`;

    return this.client.send_json({
      type: 'GET',
      url: this.client.create_url(url),
    });
  }

  /*
  Search GIFs for a word or phrase.

  @param {Object} options
  @param {string} options - query search query term or phrase
  @param {number} options.limit=25 - Number of results to return (maximum 100, default 25)
  @param {number} options.offset=0 - Results offset (defaults 0)
  @param {string} options.sorting='relevant' - Relevant or recent
  */
  get_search(options) {
    options = Object.assign({
      limit: 25,
      offset: 0,
      sorting: 'relevant',
    }, options);

    const url = `${this.GIPHY_ENDPOINT_BASE}/search` +
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
