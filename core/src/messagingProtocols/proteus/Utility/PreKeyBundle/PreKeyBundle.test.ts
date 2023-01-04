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

import type {UserClients} from '@wireapp/api-client/lib/conversation';
import type {UserPreKeyBundleMap} from '@wireapp/api-client/lib/user';

import {preKeyBundleToUserClients} from './PreKeyBundle';

const firstUser = {
  id: 'bc0c99f1-49a5-4ad2-889a-62885af37088',
  clients: {first: 'be67218b77d02d30', second: 'ae87218e77d02d30'},
};

const secondUser = {
  id: 'bc0c99ff-ffa5-ffd2-ff9a-6ff85af3ff88',
  clients: {first: 'kk67218b77d02d30', second: 'kk87218e77d02d30'},
};

const validPreKey = {
  id: 1337,
  key: 'pQABARn//wKhAFggJ1Fbpg5l6wnzKOJE+vXpRnkqUYhIvVnR5lNXEbO2o/0DoQChAFggHxZvgvtDktY/vqBcpjjo6rQnXvcNQhfwmy8AJQJKlD0E9g==',
};

describe('PrekeyHandler', () => {
  describe('preKeyBundleToUserClients', () => {
    it('maps preKeyBundle to userClients', () => {
      const input: UserPreKeyBundleMap = {
        [firstUser.id]: {[firstUser.clients.first]: validPreKey},
      };

      const output: UserClients = {
        [firstUser.id]: [firstUser.clients.first],
      };

      expect(preKeyBundleToUserClients(input)).toEqual(output);
    });

    it('maps preKeyBundle to userClients (multiple clients)', () => {
      const input: UserPreKeyBundleMap = {
        [firstUser.id]: {[firstUser.clients.first]: validPreKey, [firstUser.clients.second]: validPreKey},
      };

      const output: UserClients = {
        [firstUser.id]: [firstUser.clients.first, firstUser.clients.second],
      };

      expect(preKeyBundleToUserClients(input)).toEqual(output);
    });

    it('maps preKeyBundle to userClients (multiple users)', () => {
      const input: UserPreKeyBundleMap = {
        [firstUser.id]: {[firstUser.clients.first]: validPreKey, [firstUser.clients.second]: validPreKey},
        [secondUser.id]: {[secondUser.clients.first]: validPreKey, [secondUser.clients.second]: validPreKey},
      };

      const output: UserClients = {
        [firstUser.id]: [firstUser.clients.first, firstUser.clients.second],
        [secondUser.id]: [secondUser.clients.first, secondUser.clients.second],
      };

      expect(preKeyBundleToUserClients(input)).toEqual(output);
    });
  });
});
