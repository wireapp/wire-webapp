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

import {ClientEntity} from 'Repositories/client/cliententity';
import {ACCENT_ID} from 'src/script/config';
import {TIME_IN_MILLIS} from 'Util/timeUtil';

import {User} from './user';
import {translateForTest} from 'Util/test/translatefortest';

describe('User', () => {
  describe('Initials', () => {
    it('returns correct initials for user with first name and last name', () => {
      const user = new User('', '', translateForTest);
      user.name('John Doe');

      expect(user.initials()).toBe('JD');
    });

    it('returns correct initials for user with just a first name', () => {
      const user = new User('', '', translateForTest);
      user.name('John');

      expect(user.initials()).toBe('JO');
    });

    it('returns correct initials for user with middle name', () => {
      const user = new User('', '', translateForTest);
      user.name('John Peter Doe');

      expect(user.initials()).toBe('JD');
    });

    it('returns correct initials for user with one character as name', () => {
      const user = new User('', '', translateForTest);
      user.name('J');

      expect(user.initials()).toBe('J');
    });

    it('returns correct initials for user with an emoji as name', () => {
      const user = new User('', '', translateForTest);
      user.name('🐒');

      expect(user.initials()).toBe('🐒');
    });
  });

  describe('addClient', () => {
    it('accepts clients which are no duplicates', () => {
      const first_client = new ClientEntity(false, null);
      first_client.id = '5021d77752286cac';

      const second_client = new ClientEntity(false, null);
      second_client.id = '575b7a890cdb7635';

      const user = new User('', '', translateForTest);
      user.addClient(first_client);
      user.addClient(second_client);
      user.addClient(second_client);

      expect(user.devices().length).toBe(2);
    });

    it('keeps own devices sorted by descending creation time', () => {
      const olderClient = new ClientEntity(false, null);
      olderClient.id = 'older-client';
      olderClient.time = '2024-01-01T00:00:00.000Z';

      const newerClient = new ClientEntity(false, null);
      newerClient.id = 'newer-client';
      newerClient.time = '2024-01-02T00:00:00.000Z';

      const user = new User('', '', translateForTest);
      user.isMe = true;

      user.addClient(olderClient);
      user.addClient(newerClient);

      expect(user.devices().map(clientEntity => clientEntity.id)).toEqual(['newer-client', 'older-client']);
    });
  });

  describe('accent_color', () => {
    it('can change the accent color', () => {
      const userEntity = new User('', '', translateForTest);
      userEntity.accent_id(ACCENT_ID.BLUE);

      expect(userEntity.accent_color()).toBe(User.ACCENT_COLOR[ACCENT_ID.BLUE]);

      Object.values(ACCENT_ID).forEach(accentId => {
        userEntity.accent_id(accentId);

        expect(userEntity.accent_color()).toBe(User.ACCENT_COLOR[accentId]);
      });

      userEntity.accent_id(undefined);

      expect(userEntity.accent_color()).toBe(User.ACCENT_COLOR[ACCENT_ID.BLUE]);
    });
  });

  describe('translation injection', () => {
    it('uses the injected translate function for temporary guest expiration text', () => {
      const translate = jest.fn((translationKey: string, replacements?: {time: number}) => {
        return `translated:${translationKey}:${replacements?.time}`;
      });
      const user = new User('', '', translate);

      user.setGuestExpiration(Date.now() + 30 * TIME_IN_MILLIS.MINUTE);

      expect(user.expirationText()).toBe('translated:userRemainingTimeMinutes:30');
    });
  });
});
