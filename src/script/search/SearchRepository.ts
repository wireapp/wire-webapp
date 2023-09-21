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

import type {QualifiedId} from '@wireapp/api-client/lib/user/';
import {container} from 'tsyringe';

import {EMOJI_RANGES} from 'Util/EmojiUtil';
import {getLogger, Logger} from 'Util/Logger';
import {
  computeTransliteration,
  replaceAccents,
  sortByPriority,
  startsWith,
  transliterationIndex,
} from 'Util/StringUtil';

import type {SearchService} from './SearchService';

import type {User} from '../entity/User';
import {Core} from '../service/CoreSingleton';
import {validateHandle} from '../user/UserHandleGenerator';
import type {UserRepository} from '../user/UserRepository';

export class SearchRepository {
  logger: Logger;

  private readonly searchService: SearchService;

  private readonly userRepository: UserRepository;

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
   * @param query Search string
   * @returns Normalized search query
   */
  static normalizeQuery(query: string): string {
    if (typeof query !== 'string') {
      return '';
    }
    return query.trim().replace(/^[@]/, '').toLowerCase();
  }

  /**
   * @param searchService SearchService
   * @param userRepository Repository for all user interactions
   */
  constructor(
    searchService: SearchService,
    userRepository: UserRepository,
    private readonly core = container.resolve(Core),
  ) {
    this.searchService = searchService;
    this.userRepository = userRepository;
    this.logger = getLogger('SearchRepository');
  }

  /**
   * Search for a user in the given user list and given a search term.
   * Doesn't sort the results and keep the initial order of the given user list.
   *
   * @param term the search term
   * @param userEntities entities to match the search term against
   * @param properties list of properties that will be matched against the search term
   *    the order of the properties in the array indicates the priorities by which results will be sorted
   * @returns the filtered list of users
   */
  searchUserInSet(
    term: string,
    userEntities: User[],
    properties = [SearchRepository.CONFIG.SEARCHABLE_FIELDS.NAME, SearchRepository.CONFIG.SEARCHABLE_FIELDS.USERNAME],
  ): User[] {
    if (term === '') {
      return userEntities;
    }
    const excludedEmojis = Array.from(term).reduce<Record<string, string>>((emojis, char) => {
      const isEmoji = EMOJI_RANGES.includes(char);
      if (isEmoji) {
        emojis[char] = char;
      }
      return emojis;
    }, {});
    const termSlug = computeTransliteration(term, excludedEmojis);
    const weightedResults = userEntities.reduce<{user: User; weight: number}[]>((results, userEntity) => {
      /*
        given user of name Bardia and username of bardia_wire this mapping
        will get name & username properties and return an array value like ['Bardia', 'bardia_wire']
      */
      const values: string[] = properties
        .slice()
        .reverse()
        .map(prop => {
          const property = prop as keyof User;
          return typeof userEntity[property] === 'function'
            ? (userEntity[property] as Function)()
            : userEntity[property];
        });

      const uniqueValues = Array.from(new Set(values));
      const matchWeight = uniqueValues.reduce((weight, value, index) => {
        const propertyWeight = 10 * index + 1;
        const propertyMatchWeight = this.matches(term, termSlug, excludedEmojis, value);
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

  private matches(term: string, termSlug: string, excludedChars?: Record<string, string>, value: string = ''): number {
    const isStrictMatch = (value || '').toLowerCase().startsWith(term.toLowerCase());
    if (isStrictMatch) {
      // if the pattern matches the raw text, give the maximum value to the match
      return 100;
    }
    const nameSlug = computeTransliteration(value, excludedChars);
    const nameIndexWithSlug = transliterationIndex(nameSlug, termSlug);
    const nameIndexReplacedAccents = transliterationIndex(replaceAccents(value).toLowerCase(), term.toLowerCase());
    const nameIndex = Math.max(nameIndexWithSlug, nameIndexReplacedAccents);
    const isStrictTransliteratedMatch = nameIndex === 0;
    if (isStrictTransliteratedMatch) {
      // give a little less points if the pattern strictly matches the transliterated string
      return 50;
    }
    const noMatch = nameIndex < 0;
    if (noMatch) {
      return 0;
    }

    const tokens = nameSlug.split(/-/g);
    // computing the match value by testing all components of the property
    return tokens.reverse().reduce((weight, token, index) => {
      const indexWeight = index + 1;
      let tokenWeight = 0;
      const tokenIndex = transliterationIndex(token, termSlug);

      if (tokenIndex === 0) {
        tokenWeight = indexWeight * 10;
      } else if (tokenIndex > 0) {
        tokenWeight = indexWeight;
      }

      return weight + tokenWeight;
    }, 0);
  }

  /**
   * Search for users on the backend by name.
   * @note We skip a few results as connection changes need a while to reflect on the backend.
   *
   * @param query Search query
   * @param isHandle Is query a user handle
   * @param maxResults Maximum number of results
   * @returns Resolves with the search results
   */
  async searchByName(
    query: string,
    isHandle?: boolean,
    maxResults = SearchRepository.CONFIG.MAX_SEARCH_RESULTS,
  ): Promise<User[]> {
    const [rawName, rawDomain] = this.core.backendFeatures.isFederated ? query.replace(/^@/, '').split('@') : [query];
    const [name, domain] = validateHandle(rawName, rawDomain) ? [rawName, rawDomain] : [query];

    const matchedUserIdsFromDirectorySearch: QualifiedId[] = await this.searchService
      .getContacts(name, SearchRepository.CONFIG.MAX_DIRECTORY_RESULTS, domain)
      .then(({documents}) => documents.map(match => ({domain: match.qualified_id?.domain || '', id: match.id})));

    const userIds: QualifiedId[] = [...matchedUserIdsFromDirectorySearch];
    const userEntities = await this.userRepository.getUsersById(userIds);

    return Promise.resolve(userEntities)
      .then(userEntities => userEntities.filter(userEntity => !userEntity.isMe))
      .then(userEntities => {
        if (isHandle) {
          userEntities = userEntities.filter(userEntity => startsWith(userEntity.username(), query));
        }

        return userEntities
          .sort((userA, userB) => {
            return isHandle
              ? sortByPriority(userA.username(), userB.username(), query)
              : sortByPriority(userA.name(), userB.name(), query);
          })
          .slice(0, maxResults);
      });
  }
}
