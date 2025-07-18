/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {constructClientId, parseClientId} from './ClientIdUtil';

describe('ClientIdUtil', () => {
  it.each([
    [{id: 'user1', domain: ''}, 'client1'],
    [{id: 'user2', domain: ''}, 'client2'],
  ])('constructs and parse clientIds without domain', (userId, client) => {
    const clientId = constructClientId(userId, client);

    const result = parseClientId(clientId);

    expect(result).toEqual({userId: userId.id, clientId: client});
  });

  it.each([
    [{id: 'user1', domain: 'domain1'}, 'client1'],
    [{id: 'user2', domain: 'domain2'}, 'client2'],
  ])('constructs and parse clientIds without domain', (userId, client) => {
    const clientId = constructClientId(userId, client);

    const result = parseClientId(clientId);

    expect(result).toEqual({userId: userId.id, domain: userId.domain, clientId: client});
  });
});
