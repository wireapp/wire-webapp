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

import {flattenUserClientsQualifiedIds} from './userClientsUtils';

describe('userClientsUtils', () => {
  it('extracts user and client info from payload', () => {
    const payload = {domain1: {user1: ['client1'], user2: ['client11']}, domain2: {user3: ['client1', 'client2']}};
    const expected = [
      {clients: ['client1'], userId: {domain: 'domain1', id: 'user1'}},
      {clients: ['client11'], userId: {domain: 'domain1', id: 'user2'}},
      {clients: ['client1', 'client2'], userId: {domain: 'domain2', id: 'user3'}},
    ];

    expect(flattenUserClientsQualifiedIds(payload)).toEqual(expected);
  });
});
