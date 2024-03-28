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

import {flattenUserMap, nestUsersList} from './UserClientsUtil';

describe('userClientsUtils', () => {
  it('extracts user and data info from qualified payload', () => {
    const payload = {domain1: {user1: ['client1'], user2: ['client11']}, domain2: {user3: ['client1', 'client2']}};
    const expected = [
      {data: ['client1'], userId: {domain: 'domain1', id: 'user1'}},
      {data: ['client11'], userId: {domain: 'domain1', id: 'user2'}},
      {data: ['client1', 'client2'], userId: {domain: 'domain2', id: 'user3'}},
    ];

    expect(flattenUserMap(payload)).toEqual(expected);
  });

  it('nest and flatten are inverse operations', () => {
    const payload = {domain1: {user1: ['client1'], user2: ['client11']}, domain2: {user3: ['client1', 'client2']}};

    const result = nestUsersList(flattenUserMap(payload));

    expect(result).toEqual(payload);
  });
});
