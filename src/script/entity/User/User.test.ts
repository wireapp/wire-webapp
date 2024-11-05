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

import {ClientEntity} from 'Repositories/client/ClientEntity';
import {ACCENT_ID} from 'src/script/Config';

import {User} from './User';

describe('User', () => {
  describe('Initials', () => {
    it('returns correct initials for user with first name and last name', () => {
      const user = new User();
      user.name('John Doe');

      expect(user.initials()).toBe('JD');
    });

    it('returns correct initials for user with just a first name', () => {
      const user = new User();
      user.name('John');

      expect(user.initials()).toBe('JO');
    });

    it('returns correct initials for user with middle name', () => {
      const user = new User();
      user.name('John Peter Doe');

      expect(user.initials()).toBe('JD');
    });

    it('returns correct initials for user with one character as name', () => {
      const user = new User();
      user.name('J');

      expect(user.initials()).toBe('J');
    });

    it('returns correct initials for user with an emoji as name', () => {
      const user = new User();
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

      const user = new User();
      user.addClient(first_client);
      user.addClient(second_client);
      user.addClient(second_client);

      expect(user.devices().length).toBe(2);
    });
  });

  describe('accent_color', () => {
    it('can change the accent color', () => {
      const userEntity = new User();
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
});
