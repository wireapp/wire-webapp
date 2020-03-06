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

import {User} from 'src/script/entity/User';
import {TestFactory} from '../../helper/TestFactory';

describe('SearchRepository', () => {
  const testFactory = new TestFactory();

  beforeAll(() => {
    return testFactory.exposeSearchActors();
  });

  describe('searchUserInSet', () => {
    const sabine = generateUser('jesuissabine', 'Sabine Duchemin');
    const janina = generateUser('yosoyjanina', 'Janina Felix');
    const felixa = generateUser('iamfelix', 'Felix Abo');
    const felix = generateUser('iamfelix', 'Felix Oulala');
    const felicien = generateUser('ichbinfelicien', 'Felicien Delatour');
    const lastguy = generateUser('lastfelicien', 'lastsabine lastjanina');
    const jeanpierre = generateUser('jean-pierre', 'Jean-Pierre Sansbijou');
    const pierre = generateUser('pierrot', 'Pierre Monsouci');
    const noMatch1 = generateUser(undefined, 'yyy yyy');
    const noMatch2 = generateUser('xxx', undefined);
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

    tests.forEach(({expected, term, testCase}) => {
      it(`${testCase} term: ${term}`, () => {
        const suggestions = testFactory.search_repository.searchUserInSet(term, users);

        expect(suggestions.map(serializeUser)).toEqual(expected.map(serializeUser));
      });
    });

    it('does not replace numbers with emojis', () => {
      const felix10 = generateUser('simple10', 'Felix10');
      const unsortedUsers = [felix10];
      const suggestions = testFactory.search_repository.searchUserInSet('😋', unsortedUsers);

      expect(suggestions.map(serializeUser)).toEqual([]);
    });

    it('prioritize exact matches with special characters', () => {
      const smilyFelix = generateUser('smily', '😋Felix');
      const atFelix = generateUser('at', '@Felix');
      const simplyFelix = generateUser('simple', 'Felix');

      const unsortedUsers = [atFelix, smilyFelix, simplyFelix];

      let suggestions = testFactory.search_repository.searchUserInSet('felix', unsortedUsers);
      let expected = [simplyFelix, smilyFelix, atFelix];

      expect(suggestions.map(serializeUser)).toEqual(expected.map(serializeUser));
      suggestions = testFactory.search_repository.searchUserInSet('😋', unsortedUsers);
      expected = [smilyFelix];

      expect(suggestions.map(serializeUser)).toEqual(expected.map(serializeUser));
    });

    it('handles sorting matching results', () => {
      const first = generateUser('xxx', '_surname');
      const second = generateUser('xxx', 'surname _lastname');
      const third = generateUser('_xxx', 'surname lastname');
      const fourth = generateUser('xxx', 'sur_name lastname');
      const fifth = generateUser('xxx', 'surname last_name');
      const sixth = generateUser('x_xx', 'surname lastname');

      const unsortedUsers = [sixth, fifth, third, second, first, fourth];
      const expectedUsers = [first, second, third, fourth, fifth, sixth];

      const suggestions = testFactory.search_repository.searchUserInSet('_', unsortedUsers);

      expect(suggestions.map(serializeUser)).toEqual(expectedUsers.map(serializeUser));
    });
  });
});

function generateUser(handle, name) {
  const user = new User();
  user.username(handle);
  user.name(name);
  return user;
}
function serializeUser(userEntity) {
  return {name: userEntity.name(), username: userEntity.username()};
}
