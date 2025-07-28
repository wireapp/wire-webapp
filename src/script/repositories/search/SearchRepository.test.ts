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

import {User} from 'Repositories/entity/User';
import {UserRepository} from 'Repositories/user/UserRepository';
import {generateUser} from 'test/helper/UserGenerator';
import {createUuid} from 'Util/uuid';

import {SearchRepository} from './SearchRepository';

import {randomInt} from '../../auth/util/randomUtil';
import {generateUsers} from '../../auth/util/test/TestUtil';
import {APIClient} from '../../service/APIClientSingleton';
import {Core} from '../../service/CoreSingleton';

function buildSearchRepository() {
  const userRepository = {getUsersById: jest.fn(() => [])} as unknown as jest.Mocked<UserRepository>;
  const core = {backendFeatures: {isFederated: false}} as unknown as jest.Mocked<Core>;
  const apiClient = {api: {user: {getSearchContacts: jest.fn()}}} as unknown as jest.Mocked<APIClient>;
  const searchRepository = new SearchRepository(userRepository, core, apiClient);
  return [searchRepository, {userRepository, core, apiClient}] as const;
}

describe('SearchRepository', () => {
  describe('searchUserInSet', () => {
    const sabine = createUser('jesuissabine', 'Sabine Duchemin');
    const janina = createUser('yosoyjanina', 'Janina Felix');
    const felixa = createUser('iamfelix', 'Felix Abo');
    const felix = createUser('iamfelix', 'Felix Oulala');
    const felicien = createUser('ichbinfelicien', 'Felicien Delatour');
    const lastguy = createUser('lastfelicien', 'lastsabine lastjanina');
    const jeanpierre = createUser('jean-pierre', 'Jean-Pierre Sansbijou');
    const pierre = createUser('pierrot', 'Pierre Monsouci');
    const noMatch1 = createUser(undefined, 'yyy yyy');
    const noMatch2 = createUser('xxx', undefined);
    const users = [lastguy, noMatch1, felix, felicien, sabine, janina, noMatch2, felixa, jeanpierre, pierre];

    const tests = [
      {expected: users, term: '', testCase: 'returns the whole user list if no term is given'},
      {expected: [jeanpierre, janina, sabine, lastguy], term: 'j', testCase: 'matches multiple results'},
      {
        expected: [janina, lastguy],
        term: 'ja',
        testCase: 'puts matches that start with the pattern on top of the list',
      },
      {
        expected: [felicien, felixa, felix, janina, lastguy],
        term: 'fel',
        testCase: 'sorts by name, handle, inside match and alphabetically',
      },
      {
        expected: [felixa, felix, janina],
        term: 'felix',
        testCase: 'sorts by firstname and lastname',
      },
      {
        expected: [felicien, lastguy],
        term: 'felici',
        testCase: 'sorts by name and inside match',
      },
      {
        expected: [sabine, jeanpierre, lastguy, pierre, janina],
        term: 's',
        testCase: 'sorts by name, handle and inside match',
      },
      {
        expected: [sabine, jeanpierre, lastguy],
        term: 'sa',
        testCase: 'puts matches that start with the pattern on top of the list',
      },
      {
        expected: [sabine, lastguy],
        term: 'sabine',
        testCase: 'puts matches that start with the pattern on top of the list',
      },
      {
        expected: [sabine, lastguy],
        term: 'sabine',
        testCase: 'puts matches that start with the pattern on top of the list',
      },
      {expected: [felicien, lastguy], term: 'ic', testCase: 'matches inside the properties'},
      {
        expected: [jeanpierre],
        term: 'jean-pierre',
        testCase: 'finds compound names',
      },
      {
        expected: [pierre, jeanpierre],
        term: 'pierre',
        testCase: 'matches compound names and prioritize matches from start',
      },
    ];

    const [searchRepository] = buildSearchRepository();

    tests.forEach(({expected, term, testCase}) => {
      it(`${testCase} term: ${term}`, () => {
        const suggestions = searchRepository.searchUserInSet(term, users);

        expect(suggestions.map(serializeUser)).toEqual(expected.map(serializeUser));
      });
    });

    it('does not replace numbers with emojis', () => {
      const [searchRepository] = buildSearchRepository();
      const felix10 = createUser('simple10', 'Felix10');
      const unsortedUsers = [felix10];
      const suggestions = searchRepository.searchUserInSet('😋', unsortedUsers);

      expect(suggestions.map(serializeUser)).toEqual([]);
    });

    it('prioritize exact matches with special characters', () => {
      const [searchRepository] = buildSearchRepository();
      const smilyFelix = createUser('smily', '😋Felix');
      const atFelix = createUser('at', '@Felix');
      const simplyFelix = createUser('simple', 'Felix');

      const unsortedUsers = [atFelix, smilyFelix, simplyFelix];

      let suggestions = searchRepository.searchUserInSet('felix', unsortedUsers);
      let expected = [simplyFelix, smilyFelix, atFelix];

      expect(suggestions.map(serializeUser)).toEqual(expected.map(serializeUser));
      suggestions = searchRepository.searchUserInSet('😋', unsortedUsers);
      expected = [smilyFelix];

      expect(suggestions.map(serializeUser)).toEqual(expected.map(serializeUser));
    });

    it('only search by handle when a handle is given', () => {
      const [searchRepository] = buildSearchRepository();
      const felix = createUser('felix', 'Felix');
      const notmatching1 = createUser('notix', 'Felix');
      const notmatching2 = createUser('simple', 'Felix');

      const unsortedUsers = [notmatching1, felix, notmatching2];

      const suggestions = searchRepository.searchUserInSet('@felix', unsortedUsers);
      const expected = [felix];

      expect(suggestions.map(serializeUser)).toEqual(expected.map(serializeUser));
    });

    it('handles sorting matching results', () => {
      const [searchRepository] = buildSearchRepository();
      const first = createUser('xxx', '_surname');
      const second = createUser('xxx', 'surname _lastname');
      const third = createUser('_xxx', 'surname lastname');
      const fourth = createUser('xxx', 'sur_name lastname');
      const fifth = createUser('xxx', 'surname last_name');
      const sixth = createUser('x_xx', 'surname lastname');

      const unsortedUsers = [sixth, fifth, third, second, first, fourth];
      const expectedUsers = [first, second, third, fourth, fifth, sixth];

      const suggestions = searchRepository.searchUserInSet('_', unsortedUsers);

      expect(suggestions.map(serializeUser)).toEqual(expectedUsers.map(serializeUser));
    });
  });

  describe('searchByName', () => {
    it('returns empty array if no users are found', async () => {
      const [searchRepository, {apiClient}] = buildSearchRepository();
      jest.spyOn(apiClient.api.user, 'getSearchContacts').mockResolvedValue({response: {documents: []}} as any);

      const suggestions = await searchRepository.searchByName('term');

      expect(suggestions).toEqual([]);
    });

    it('matches remote results with local users', async () => {
      const [searchRepository, {apiClient, userRepository}] = buildSearchRepository();
      const nbUsers = randomInt(10);
      const localUsers = generateUsers(nbUsers, 'domain');

      userRepository.getUsersById.mockResolvedValue(localUsers);
      const searchResults = localUsers.map(({qualifiedId}) => qualifiedId);
      jest
        .spyOn(apiClient.api.user, 'getSearchContacts')
        .mockResolvedValue({response: {documents: searchResults}} as any);

      const suggestions = await searchRepository.searchByName('term');

      expect(suggestions).toHaveLength(nbUsers);
    });

    it('matches exact handle match', async () => {
      const [searchRepository, {apiClient, userRepository}] = buildSearchRepository();
      const localUsers = [createUser('felix', 'felix'), createUser('notfelix', 'notfelix')];

      userRepository.getUsersById.mockResolvedValue(localUsers);
      const searchResults = localUsers.map(({qualifiedId}) => qualifiedId);
      jest
        .spyOn(apiClient.api.user, 'getSearchContacts')
        .mockResolvedValue({response: {documents: searchResults}} as any);

      const suggestions = await searchRepository.searchByName('@felix');

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toBe(localUsers[0]);
    });

    it('filters out selfUser', async () => {
      const [searchRepository, {apiClient, userRepository}] = buildSearchRepository();
      const selfUser = generateUser();
      selfUser.isMe = true;
      const localUsers = [generateUser(), generateUser(), generateUser(), selfUser];
      userRepository.getUsersById.mockResolvedValue(localUsers);

      const searchResults = localUsers.map(({qualifiedId}) => qualifiedId);
      jest
        .spyOn(apiClient.api.user, 'getSearchContacts')
        .mockResolvedValue({response: {documents: searchResults}} as any);

      const suggestions = await searchRepository.searchByName('term');

      expect(suggestions.length).toEqual(localUsers.length - 1);
    });

    it('returns team users first', async () => {
      const [searchRepository, {apiClient, userRepository}] = buildSearchRepository();
      const teamId = createUuid();
      const teamUsers = [generateUser(undefined, {team: teamId}), generateUser(undefined, {team: teamId})];
      const otherTeamUsers = [generateUser(undefined, {team: createUuid()})];
      const localUsers = [generateUser(), generateUser(), generateUser()];
      const allUsers = [...localUsers, ...otherTeamUsers, ...teamUsers];
      userRepository.getUsersById.mockResolvedValue(allUsers);

      const searchResults = allUsers.map(({qualifiedId}) => qualifiedId);
      jest
        .spyOn(apiClient.api.user, 'getSearchContacts')
        .mockResolvedValue({response: {documents: searchResults}} as any);

      const suggestions = await searchRepository.searchByName('term', teamId);

      expect(suggestions.length).toEqual(allUsers.length);
      expect(suggestions[0].teamId).toEqual(teamId);
      expect(suggestions[1].teamId).toEqual(teamId);
    });
  });
});

function createUser(handle: string | undefined, name: string | undefined) {
  const user = new User();
  if (handle) {
    user.username(handle);
  }
  if (name) {
    user.name(name);
  }
  return user;
}
function serializeUser(userEntity: User) {
  return {name: userEntity.name(), username: userEntity.username()};
}
