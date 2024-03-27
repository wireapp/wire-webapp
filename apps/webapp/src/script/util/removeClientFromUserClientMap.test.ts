/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {removeClientFromUserClientMap} from './removeClientFromUserClientMap';

describe('removeClientFromUserClientMap', () => {
  it('removes client from user map', () => {
    const userMap = {
      user1: ['a', 'b', 'c'],
      user2: ['d', 'e', 'f'],
    };
    const clientToExclude = {
      userId: 'user1',
      clientId: 'b',
    };
    const expectedUserMap = {
      user1: ['a', 'c'],
      user2: ['d', 'e', 'f'],
    };
    const result = removeClientFromUserClientMap(userMap, clientToExclude);
    expect(result).toEqual(expectedUserMap);
  });

  it('removes client from qualified user map', () => {
    const userMap = {
      'example.com': {
        user1: ['a', 'b', 'c'],
        user2: ['d', 'e', 'f'],
      },
    };
    const clientToExclude = {
      domain: 'example.com',
      userId: 'user1',
      clientId: 'b',
    };
    const expectedUserMap = {
      'example.com': {
        user1: ['a', 'c'],
        user2: ['d', 'e', 'f'],
      },
    };
    const result = removeClientFromUserClientMap(userMap, clientToExclude);
    expect(result).toEqual(expectedUserMap);
  });
});
