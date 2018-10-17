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
window.z.search = z.search || {};

z.search.SearchService = class SearchService {
  /**
   * Construct a new Search Service.
   * @param {z.service.BackendClient} client - Client for the API calls
   */
  constructor(client) {
    this.client = client;
    this.logger = new z.util.Logger('z.search.SearchService', z.config.LOGGER.OPTIONS);
  }

  /**
   * Search for a user.
   *
   * @param {string} query - Query string (case insensitive)
   * @param {number} size - Number of requested user
   * @returns {Promise} Resolves with the search results
   */
  getContacts(query, size) {
    return this.client.sendRequest({
      data: {
        // eslint-disable-next-line id-length
        q: query,
        size,
      },
      type: 'GET',
      url: '/search/contacts',
    });
  }
};
