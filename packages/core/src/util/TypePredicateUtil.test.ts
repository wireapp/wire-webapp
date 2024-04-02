/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {isQualifiedUserClients} from './TypePredicateUtil';

describe('TypePredicatUtil', () => {
  describe('isQualifiedUserClients', () => {
    it('detects QualifiedUserClients', () => {
      const validUserClients = [
        {domain1: {user1: ['client1']}},
        {domain1: {user1: []}}, // When a user has no clients
      ];

      validUserClients.forEach(payload => expect(isQualifiedUserClients(payload)).toBeTruthy());
    });

    it('rejects non QualifiedUserClients', () => {
      const invalidUserClients = [
        {domain1: {user1: ''}},
        {domain1: {user1: {}}},
        {domain1: []},
        {domain1: {user1: [{}]}},
      ];

      invalidUserClients.forEach(payload => expect(isQualifiedUserClients(payload)).toBeFalsy());
    });
  });
});
