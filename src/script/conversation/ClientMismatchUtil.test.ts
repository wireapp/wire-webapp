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

import {ClientEntity} from '../client/ClientEntity';
import {User} from '../entity/User';
import {extractClientDiff} from './ClientMismatchUtil';

describe('ClientMismatchUtil', () => {
  describe('extractClientDiff', () => {
    it('extract missing and deleted clients from a mismatch when no users given', () => {
      const mismatch = {
        deleted: {
          user3: ['client1', 'client2'],
          user4: ['client1', 'client2'],
        },
        missing: {
          user1: ['client1', 'client2'],
          user2: ['client1', 'client2'],
        },
      };
      const {missingClients, deletedClients, missingUserIds, emptyUsers} = extractClientDiff(mismatch);

      expect(emptyUsers).toEqual([]);
      expect(missingUserIds).toEqual([]);
      expect(missingClients).toEqual([
        {clients: ['client1', 'client2'], userId: {domain: '', id: 'user1'}},
        {clients: ['client1', 'client2'], userId: {domain: '', id: 'user2'}},
      ]);
      expect(deletedClients).toEqual([
        {clients: ['client1', 'client2'], userId: {domain: '', id: 'user3'}},
        {clients: ['client1', 'client2'], userId: {domain: '', id: 'user4'}},
      ]);
    });

    it('extract full diff with mismatch when users are given', () => {
      const mismatch = {
        deleted: {
          user3: ['client1', 'client2'],
          user4: ['client1'],
        },
        missing: {
          user1: ['client1', 'client2'],
          user2: ['client1', 'client2'],
        },
      };
      const userWithoutClients = new User('user3');
      userWithoutClients.devices([new ClientEntity(false, '', 'client1'), new ClientEntity(false, '', 'client2')]);

      const userWithClientsLeft = new User('user4');
      userWithClientsLeft.devices([new ClientEntity(false, '', 'client1'), new ClientEntity(false, '', 'client2')]);

      const {missingClients, deletedClients, missingUserIds, emptyUsers} = extractClientDiff(mismatch, [
        userWithClientsLeft,
        userWithoutClients,
      ]);

      expect(emptyUsers).toEqual([userWithoutClients]);
      expect(missingUserIds).toEqual([
        {domain: '', id: 'user1'},
        {domain: '', id: 'user2'},
      ]);
      expect(missingClients).toEqual([
        {clients: ['client1', 'client2'], userId: {domain: '', id: 'user1'}},
        {clients: ['client1', 'client2'], userId: {domain: '', id: 'user2'}},
      ]);
      expect(deletedClients).toEqual([
        {clients: ['client1', 'client2'], userId: {domain: '', id: 'user3'}},
        {clients: ['client1'], userId: {domain: '', id: 'user4'}},
      ]);
    });

    it('only gives unknown missing clients when users are given', () => {
      const mismatch = {
        missing: {
          user1: ['client1', 'client2'],
          user2: ['client1', 'client2'],
        },
      };
      const user1 = new User('user1');
      user1.devices([new ClientEntity(false, '', 'client1'), new ClientEntity(false, '', 'client2')]);

      const user2 = new User('user2');
      user2.devices([new ClientEntity(false, '', 'client1')]);

      const {missingClients} = extractClientDiff(mismatch, [user1, user2]);

      expect(missingClients).toEqual([{clients: ['client2'], userId: {domain: '', id: 'user2'}}]);
    });
  });
});
