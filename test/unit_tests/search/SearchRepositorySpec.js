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

// grunt test_init && grunt test_run:search/SearchRepository

'use strict';

describe('z.search.SearchRepository', () => {
  const test_factory = new TestFactory();

  beforeAll(() => {
    return test_factory.exposeSearchActors();
  });

  describe('searchUserInSet', () => {
    const sabine = generateUser('jesuissabine', 'Sabine', 'Duchemin');
    const janina = generateUser('yosoyjanina', 'Janina', 'Felix');
    const felix = generateUser('iamfelix', 'Felix', 'Felicitation');
    const felicien = generateUser('ichbinfelicien', 'Felicien', 'Delatour');
    const lastguy = generateUser('lastfelicien', 'lastsabine', 'lastjanina');
    const noMatch1 = generateUser(undefined, 'yyy', 'yyy');
    const noMatch2 = generateUser('xxx', undefined, 'xxx');
    const noMatch3 = generateUser('zzz', 'zzz', undefined);
    const users = [lastguy, noMatch1, felix, felicien, sabine, janina, noMatch2, noMatch3];

    const tests = [
      {expected: [janina, sabine, lastguy], term: 'j', testCase: 'matches multiple results'},
      {
        expected: [janina, lastguy],
        term: 'ja',
        testCase: 'puts matches that start with the pattern on top of the list',
      },
      {
        expected: [felix, felicien, janina, lastguy],
        term: 'fel',
        testCase: 'sorts by firstname, lastname, handle and inside match',
      },
      {
        expected: [felix, janina],
        term: 'felix',
        testCase: 'sorts by firstname and lastname',
      },
      {
        expected: [felicien, felix, lastguy],
        term: 'felici',
        testCase: 'sorts by firstname, lastname and inside match',
      },
      {
        expected: [sabine, lastguy, janina],
        term: 's',
        testCase: 'sorts by firstname, lastname, handle and inside match',
      },
      {
        expected: [sabine, lastguy],
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
      {expected: [felicien, felix, lastguy], term: 'ic', testCase: 'matches inside the properties'},
    ];

    tests.forEach(({expected, term, testCase}) => {
      it(`${testCase} term: ${term}`, () => {
        const suggestions = TestFactory.search_repository.searchUserInSet(term, users);
        expect(suggestions.map(serializeUser)).toEqual(expected.map(serializeUser));
      });
    });
  });
});

function generateUser(handle, firstname = '', lastname = '') {
  const user = new z.entity.User();
  user.username(handle);
  user.name(`${firstname} ${lastname}`);
  return user;
}
function serializeUser(userEntity) {
  return {name: userEntity.name(), username: userEntity.username()};
}
