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

import {getLogger} from 'Util/Logger';
import {EMOJI_RANGES} from 'Util/EmojiUtil';
import {compareTransliteration, startsWith, computeTransliteration, sortByPriority} from 'Util/StringUtil';

import {SearchService} from './SearchService';
import {validateHandle} from '../user/UserHandleGenerator';

export class SearchRepository {
  static get CONFIG() {
    return {
      MAX_DIRECTORY_RESULTS: 30,
      MAX_SEARCH_RESULTS: 10,
      SEARCHABLE_FIELDS: {
        NAME: 'name',
        USERNAME: 'username',
      },
    };
  }

  /**
   * Trim and remove @.
   * @param {string} query - Search string
   * @returns {string} Normalized search query
   */
  static normalizeQuery(query) {
    if (typeof query !== 'string') {
      return '';
    }
    return query
      .trim()
      .replace(/^[@]/, '')
      .toLowerCase();
  }

  /**
   * @param {BackendClient} backendClient - Client for the API calls
   * @param {UserRepository} userRepository - Repository for all user interactions
   */
  constructor(backendClient, userRepository) {
    this.searchService = new SearchService(backendClient);
    this.userRepository = userRepository;
    this.logger = getLogger('SearchRepository');
  }

  /**
   * Search for a user in the given user list and given a search term.
   * Doesn't sort the results and keep the initial order of the given user list.
   *
   * @param {string} term - the search term
   * @param {Array<User>} userEntities - entities to match the search term against
   * @param {Array<SearchRepository.CONFIG.SEARCHABLE_FIELDS>} properties=[SearchRepository.CONFIG.SEARCHABLE_FIELDS.NAME, SearchRepository.CONFIG.SEARCHABLE_FIELDS.USERNAME] - list of properties that will be matched against the search term
   *    the order of the properties in the array indicates the priorities by which results will be sorted
   * @returns {Array<User>} the filtered list of users
   */
  searchUserInSet(
    term,
    userEntities,
    properties = [SearchRepository.CONFIG.SEARCHABLE_FIELDS.NAME, SearchRepository.CONFIG.SEARCHABLE_FIELDS.USERNAME],
  ) {
    if (term === '') {
      return userEntities;
    }
    const weightedResults = userEntities.reduce((results, userEntity) => {
      const matchWeight = properties
        .slice()
        .reverse()
        .reduce((weight, property, index) => {
          const propertyWeight = 10 * index + 1;
          const propertyMatchWeight = this._matches(term, property, userEntity);
          return weight + propertyMatchWeight * propertyWeight;
        }, 0);

      return matchWeight === 0 ? results : results.concat({user: userEntity, weight: matchWeight});
    }, []);

    return weightedResults
      .sort((result1, result2) => {
        if (result2.weight === result1.weight) {
          return result2.user.name() > result1.user.name() ? -1 : 1;
        }
        return result2.weight - result1.weight;
      })
      .map(result => result.user);
  }

  _matches(term, property, userEntity) {
    const excludedEmojis = Array.from(term).reduce((emojis, char) => {
      const isEmoji = EMOJI_RANGES.includes(char);
      return isEmoji ? Object.assign({}, emojis, {[char]: char}) : emojis;
    }, {});
    const value = typeof userEntity[property] === 'function' ? userEntity[property]() : userEntity[property];

    const isStrictMatch = (value || '').toLowerCase().startsWith(term.toLowerCase());
    if (isStrictMatch) {
      // if the pattern matches the raw text, give the maximum value to the match
      return 100;
    }
    const isStrictTransliteratedMatch = compareTransliteration(value, term, excludedEmojis, true);
    if (isStrictTransliteratedMatch) {
      // give a little less points if the pattern strictly matches the transliterated string
      return 50;
    }
    const isLoosyMatch = compareTransliteration(value, term, excludedEmojis, false);
    if (!isLoosyMatch) {
      // if the pattern doesn't match loosely, then it's not a match at all
      return 0;
    }

    const tokens = computeTransliteration(value).split(/-/g);
    // computing the match value by testing all components of the property
    return tokens.reverse().reduce((weight, token, index) => {
      const indexWeight = index + 1;
      let tokenWeight = 0;

      if (compareTransliteration(token, term, excludedEmojis, true)) {
        tokenWeight = indexWeight * 10;
      } else if (compareTransliteration(token, term, excludedEmojis, false)) {
        tokenWeight = indexWeight;
      }

      return weight + tokenWeight;
    }, 0);
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

    if (validateHandle(name)) {
      searchPromises.push(this.userRepository.getUserIdByHandle(name));
    }

    return Promise.all(searchPromises)
      .then(([directoryResults, usernameResult]) => {
        if (usernameResult && !directoryResults.includes(usernameResult)) {
          directoryResults.push(usernameResult);
        }

        return directoryResults;
      })
      .then(userIds => this.userRepository.getUsersById(userIds))
      .then(userEntities => {
        return userEntities.filter(userEntity => {
          return !userEntity.isMe && !userEntity.isConnected() && !userEntity.isTeamMember();
        });
      })
      .then(userEntities => {
        if (isHandle) {
          userEntities = userEntities.filter(userEntity => startsWith(userEntity.username(), name));
        }

        return userEntities
          .sort((userA, userB) => {
            return isHandle
              ? sortByPriority(userA.username(), userB.username(), name)
              : sortByPriority(userA.name(), userB.name(), name);
          })
          .slice(0, maxResults);
      });
  }
}
