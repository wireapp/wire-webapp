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

import {filterClientsFromUserClientMap} from './filterClientFromUserClientMap';

describe('filterClientsFromUserClientMap', () => {
  it('filters clients from a user client map', () => {
    const userMap = {
      user1: ['client1', 'client2'],
      user2: ['client3', 'client4'],
    };
    const clientsToExclude = ['client1', 'client3'];
    const filteredUserMap = filterClientsFromUserClientMap(userMap, clientsToExclude);
    expect(filteredUserMap).toEqual({
      user1: ['client2'],
      user2: ['client4'],
    });
  });

  it('filters clients from a qualified user client map', () => {
    const userMap = {
      'example.com': {
        user1: ['client1', 'client3'],
      },
      'example.org': {
        user2: ['client2', 'client4'],
      },
    };
    const clientsToExclude = ['client1', 'client2'];
    const filteredUserMap = filterClientsFromUserClientMap(userMap, clientsToExclude);
    expect(filteredUserMap).toEqual({
      'example.com': {
        user1: ['client3'],
      },
      'example.org': {
        user2: ['client4'],
      },
    });
  });
});
