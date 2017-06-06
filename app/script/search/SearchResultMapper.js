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

z.search.SearchResultMapper = class SearchResultMapper {
  /**
   * Construct a new Search Result Mapper.
   */
  constructor() {
    this.logger = new z.util.Logger('z.search.SearchResultMapper', z.config.LOGGER.OPTIONS);
  }

  /**
   * Converts JSON search results from other search modes into core entities.
   *
   * @param {Array} [search_results=[]] - Search result data
   * @param {z.search.SEARCH_MODE} search_mode - Search mode to be mapped
   * @returns {Promise} Resolves with the mapped search results
   */
  map_results(search_results = [], search_mode) {
    return Promise.resolve().then(function() {
      const search_ets = search_results.map(search_result => {
        return {
          id: search_result.id,
          mutual_friends_total: search_result.total_mutual_friends
        };
      });

      return {mode: search_mode, results: search_ets};
    });
  }
};
