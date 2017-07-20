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

z.search.SearchRepository = class SearchRepository {
  static get CONFIG() {
    return {
      MAX_DIRECTORY_RESULTS: 30,
      MAX_SEARCH_RESULTS: 10,
    };
  }

  /**
   * Trim and remove @.
   * @param {string} query - Search string
   * @returns {string} Normalized search query
   */
  static normalize_query(query) {
    if (!_.isString(query)) {
      return '';
    }
    return query
      .trim()
      .replace(/^[@]/, '')
      .toLowerCase();
  }

  /**
   * Construct a new Conversation Repository.
   * @param {z.search.SearchService} search_service - Backend REST API search service implementation
   * @param {z.user.UserRepository} user_repository - Repository for all user and connection interactions
  */
  constructor(search_service, user_repository) {
    this.search_service = search_service;
    this.user_repository = user_repository;
    this.logger = new z.util.Logger('z.search.SearchRepository', z.config.LOGGER.OPTIONS);
  }

  /**
   * Search for users on the backend by name.
   * @note We skip a few results as connection changes need a while to reflect on the backend.
   *
   * @param {string} name - Search query
   * @param {boolean} is_handle - Is query a user handle
   * @param {number} [max_results=SearchRepository.CONFIG.MAX_SEARCH_RESULTS] - Maximum number of results
   * @returns {Promise} Resolves with the search results
   */
  search_by_name(name, is_handle, max_results = SearchRepository.CONFIG.MAX_SEARCH_RESULTS) {
    const directory_search = this.search_service.get_contacts(name, SearchRepository.CONFIG.MAX_DIRECTORY_RESULTS)
      .then(({documents}) => documents.map((match) => match.id));

    const search_promises = [directory_search];

    if (is_handle) {
      search_promises.push(this.user_repository.get_user_id_by_handle(name));
    }

    return Promise.all(search_promises)
      .then(([directory_results, username_result]) => {
        if (username_result && !directory_results.includes(username_result)) {
          directory_results.push(username_result);
        }

        return directory_results;
      })
      .then((user_ids) => this.user_repository.get_users_by_id(user_ids))
      .then((user_ets) => user_ets.filter((user_et) => !user_et.is_connected() && !user_et.is_team_member()))
      .then((user_ets) => {
        if (is_handle) {
          user_ets = user_ets.filter((user_et) => z.util.StringUtil.starts_with(user_et.username(), name));
        }

        return user_ets
          .sort((user_a, user_b) => {
            if (is_handle) {
              return z.util.StringUtil.sort_by_priority(user_a.username(), user_b.username(), name);
            }
            return z.util.StringUtil.sort_by_priority(user_a.name(), user_b.name(), name);
          })
          .slice(0, max_results);
      });
  }
};
