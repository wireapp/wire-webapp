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
  static normalizeQuery(query) {
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
   * @param {z.search.SearchService} searchService - Backend REST API search service implementation
   * @param {z.user.UserRepository} userRepository - Repository for all user and connection interactions
   */
  constructor(searchService, userRepository) {
    this.searchService = searchService;
    this.userRepository = userRepository;
    this.logger = new z.util.Logger('z.search.SearchRepository', z.config.LOGGER.OPTIONS);
  }

  /**
   * Search for users on the backend by name.
   * @note We skip a few results as connection changes need a while to reflect on the backend.
   *
   * @param {string} name - Search query
   * @param {boolean} isHandle - Is query a user handle
   * @param {number} [maxResults=SearchRepository.CONFIG.MAX_SEARCH_RESULTS] - Maximum number of results
   * @returns {Promise} Resolves with the search results
   */
  search_by_name(name, isHandle, maxResults = SearchRepository.CONFIG.MAX_SEARCH_RESULTS) {
    const directorySearch = this.searchService
      .getContacts(name, SearchRepository.CONFIG.MAX_DIRECTORY_RESULTS)
      .then(({documents}) => documents.map(match => match.id));

    const searchPromises = [directorySearch];

    if (z.user.UserHandleGenerator.validate_handle(name)) {
      searchPromises.push(this.userRepository.get_user_id_by_handle(name));
    }

    return Promise.all(searchPromises)
      .then(([directoryResults, usernameResult]) => {
        if (usernameResult && !directoryResults.includes(usernameResult)) {
          directoryResults.push(usernameResult);
        }

        return directoryResults;
      })
      .then(userIds => this.userRepository.get_users_by_id(userIds))
      .then(userEntities => {
        return userEntities.filter(userEntity => !userEntity.is_connected() && !userEntity.is_team_member());
      })
      .then(userEntities => {
        if (isHandle) {
          userEntities = userEntities.filter(userEntity => z.util.StringUtil.starts_with(userEntity.username(), name));
        }

        return userEntities
          .sort((userA, userB) => {
            if (isHandle) {
              return z.util.StringUtil.sort_by_priority(userA.username(), userB.username(), name);
            }
            return z.util.StringUtil.sort_by_priority(userA.name(), userB.name(), name);
          })
          .slice(0, maxResults);
      });
  }
};
