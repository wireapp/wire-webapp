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
import {SearchResult} from '@wireapp/api-client/dist/user';

export class SearchService {
  private readonly apiClient: APIClient;
  /**
   * Construct a new Search Service.
   * @param {APIClient} apiClient Client for the API calls
   */
  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
  }

  /**
   * Search for a user.
   *
   * @param {string} query Query string (case insensitive)
   * @param {number} size Number of requested user
   * @returns {Promise} Resolves with the search results
   */
  getContacts(query: string, size: number): Promise<SearchResult> {
    return this.apiClient.user.api.getSearchContacts(query, size);
  }
}
