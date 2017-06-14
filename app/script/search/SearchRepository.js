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
  /**
   * Trim and remove @.
   * @param {string} query - Search string
   * @returns {string} Normalized search query
   */
  static normalize_query(query) {
    if (!_.isString(query)) {
      return '';
    }
    return query.trim().replace(/^[@]/, '');
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

    this.search_result_mapper = new z.search.SearchResultMapper(this.user_repository);
  }

  /**
   * Search for users on the backend by name.
   * @param {string} name - Search query
   * @param {boolean} is_username - Is query a username
   * @param {number} [max_results=10] - Maximum number of results
   * @returns {Promise} Resolves with the search results
   */
  search_by_name(name, is_username, max_results = 10) {
    return this.search_service
      .get_contacts(name, 30)
      .then(({documents: matches}) => this.search_result_mapper.map_results(matches, z.search.SEARCH_MODE.CONTACTS))
      .then(({results, mode}) => this._prepare_search_result(results, mode))
      .then(user_ets => {
        if (is_username) {
          user_ets = user_ets.filter(user_et => z.util.StringUtil.starts_with(user_et.username(), name));
        }

        return user_ets
          .sort((user_a, user_b) => {
            if (is_username) {
              return z.util.StringUtil.sort_by_priority(user_a.username(), user_b.username(), name);
            }
            return z.util.StringUtil.sort_by_priority(user_a.name(), user_b.name(), name);
          })
          .slice(0, max_results);
      });
  }

  /**
   * Show on-boarding results.
   * @param {Object} response - On-boarding server response
   * @returns {Promise} Resolves with the connections and suggestions found through on-boarding
   */
  show_on_boarding(response) {
    return this.search_result_mapper
      .map_results(response.results, z.search.SEARCH_MODE.ON_BOARDING)
      .then(({results, mode}) => {
        return this._prepare_search_result(results, mode);
      })
      .then(suggested_user_ets => {
        let connections_promise;
        if (response['auto-connects'] && response['auto-connects'].length) {
          connections_promise = this.user_repository.get_user_by_id(response['auto-connects'].map(result => result.id));
        } else {
          connections_promise = Promise.resolve([]);
        }
        return connections_promise.then(function(connected_user_ets) {
          return {
            connections: connected_user_ets,
            suggestions: suggested_user_ets,
          };
        });
      });
  }

  /**
   * Preparing the search results for display.
   * @note We skip a few results as connection changes need a while to reflect on the backend.
   *
   * @private
   * @param {Array<Object>} search_ets - An array of mapped search result entities
   * @param {z.search.SEARCH_MODE} search_mode - Search mode
   * @returns {Promise} Resolves with search results
   */
  _prepare_search_result(search_ets, search_mode) {
    return this.user_repository.get_users_by_id(search_ets.map(result => result.id)).then(function(user_ets) {
      return user_ets
        .map(function(user_et) {
          const search_et = ko.utils.arrayFirst(search_ets, user => user.id === user_et.id);
          user_et.mutual_friends_total(search_et.mutual_friends_total);

          /*
         Skipping some results to adjust for slow backend updates.

         Only show connected people among your top people.
         Do not show already connected people when uploading address book.
         */
          switch (search_mode) {
            case z.search.SEARCH_MODE.CONTACTS:
            case z.search.SEARCH_MODE.ON_BOARDING:
              if (!user_et.is_connected()) {
                return user_et;
              }
              break;
            default:
              return user_et;
          }
        })
        .filter(user_et => user_et != null);
    });
  }
};
