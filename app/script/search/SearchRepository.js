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
   * Search for a user in the given user list and given a search term
   * Doesn't sort the results and keep the initial order of the given user list
   * @param {string} term - the search term
   * @param {Array<z.entity.User>} userEntities - entities to match the search term against
   * @param {Array<string>} properties=['username', 'first_name', 'last_name'] - list of properties that will be matched against the search term
   *    the order of the properties in the array indicates the priorities by which results will be sorted
   * @returns {Array<z.entity.User>} the filtered list of users
   */
  searchUserInSet(term, userEntities, properties = ['first_name', 'last_name', 'username']) {
    const excludedEmojis = Array.from(term).filter(char => {
      return z.util.EmojiUtil.UNICODE_RANGES.includes(char);
    });

    const matches = (userEntity, property, fromStart) => {
      const value = userEntity[property]() || '';
      return z.util.StringUtil.compareTransliteration(value, term, excludedEmojis, fromStart);
    };

    const weightedResults = userEntities.reduce((results, userEntity) => {
      const matchedProperties = properties.filter(property => matches(userEntity, property, false));

      if (!matchedProperties.length) {
        return results;
      }

      // add weight to the result based on the properties that matched and the position of the property in the property list
      const weight = matchedProperties.reduce((weightValue, property, index) => {
        const propertyImportance = properties.length - properties.indexOf(property);
        return weightValue + propertyImportance;
      }, 0);

      // add a weight bonus for properties that matched from the start
      const positionBonus = matchedProperties.filter(property => matches(userEntity, property, true)).length * 100;
      return results.concat({user: userEntity, weight: weight + positionBonus});
    }, []);

    return weightedResults
      .slice(0)
      .sort((res1, res2) => res2.weight - res1.weight)
      .map(result => result.user);
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
        return userEntities.filter(userEntity => !userEntity.is_connected() && !userEntity.isTeamMember());
      })
      .then(userEntities => {
        if (isHandle) {
          userEntities = userEntities.filter(userEntity => z.util.StringUtil.startsWith(userEntity.username(), name));
        }

        return userEntities
          .sort((userA, userB) => {
            return isHandle
              ? z.util.StringUtil.sortByPriority(userA.username(), userB.username(), name)
              : z.util.StringUtil.sortByPriority(userA.name(), userB.name(), name);
          })
          .slice(0, maxResults);
      });
  }
};
