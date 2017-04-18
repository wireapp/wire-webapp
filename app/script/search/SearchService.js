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
window.z.search = z.search || {};

z.search.SearchService = class SearchService {
  /**
   * Construct a new Search Service.
   * @param {z.service.Client} client - Client for the API calls
   * @returns {SearchService} Service for all search calls to the backend REST API
   */
  constructor(client) {
    this.client = client;
    this.logger = new z.util.Logger('z.search.SearchService', z.config.LOGGER.OPTIONS);
    return this;
  }

  /**
   * Search for a user.
   *
   * @param {String} query - Query string (case insensitive)
   * @param {Number} size - Number of requested user
   * @returns {Promise} Resolves with the search results
   */
  get_contacts(query, size) {
    return this.client.send_request({
      type: 'GET',
      url: this.client.create_url(`/search/contacts?q=${encodeURIComponent(query)}&size=${size}`),
    });
  }
};
