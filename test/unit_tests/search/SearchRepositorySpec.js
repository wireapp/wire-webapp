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
    const felix = generateUser('felix');
    const felicien = generateUser('felicien');
    const sabine = generateUser('sabine');
    const janina = generateUser('janina');

    it('matches the given name with usernames', () => {
      const users = [felix, felicien, sabine, janina];
      const tests = [
        {expected: [felix, felicien], term: 'f'},
        {expected: [felix, felicien], term: 'fel'},
        {expected: [felix], term: 'felix'},
        {expected: [sabine], term: 's'},
        {expected: [sabine], term: 'sa'},
        {expected: [sabine], term: 'sabine'},
      ];

      const expectPromises = tests.map(({expected, term}) => {
        const suggestions = TestFactory.search_repository.searchUserInSet(term, users);
        expect(suggestions).toEqual(expected);
      });

      return Promise.all(expectPromises);
    });
  });
});

function generateUser(namePattern) {
  const user = new z.entity.User();
  user.username(namePattern);
  return user;
}
