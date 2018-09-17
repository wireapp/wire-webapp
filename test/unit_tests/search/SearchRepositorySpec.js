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
    const janina = generateUser('ichbinjanina', 'Janina', 'Felix');
    const felix = generateUser('iamfelix', 'Felix', 'Felicitation');
    const felicien = generateUser('ichbinfelicien', 'Felicien', 'Delatour');
    const users = [felix, felicien, sabine, janina];

    it('matches the given name with usernames and sorts results', () => {
      const tests = [
        {expected: [janina, sabine], term: 'j'},
        {expected: [janina], term: 'ja'},
        {expected: [felix, felicien, janina], term: 'fel'},
        {expected: [felix, janina], term: 'felix'},
        {expected: [felicien, felix], term: 'felici'},
        {expected: [sabine], term: 's'},
        {expected: [sabine], term: 'sa'},
        {expected: [sabine], term: 'sabine'},
      ];

      tests.forEach(({expected, term}) => {
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
