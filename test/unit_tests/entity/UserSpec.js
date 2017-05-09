/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

// grunt test_init && grunt test_run:entity/User

'use strict';

describe('z.entity.User', function() {
  describe('First Name', function() {
    it('can generate first name', function() {
      const user_et = new z.entity.User();
      user_et.name('John Doe');
      expect(user_et.first_name()).toBe('John');
    });
  });

  describe('Last Name', function() {
    it('can generate last name', function() {
      const user_et = new z.entity.User();
      user_et.name('John Doe');
      expect(user_et.last_name()).toBe('Doe');
    });

    it('can generate last name', function() {
      const user_et = new z.entity.User();
      user_et.name('John D. Doe');
      expect(user_et.last_name()).toBe('Doe');
    });

    it('can ignore last name if user has only one name', function() {
      const user_et = new z.entity.User();
      user_et.name('John');
      expect(user_et.last_name()).toBeUndefined();
    });
  });

  describe('Initials', function() {
    it('returns correct initials for user with first name and last name', function() {
      const user_et = new z.entity.User();
      user_et.name('John Doe');
      expect(user_et.initials()).toBe('JD');
    });

    it('returns correct initials for user with just a first name', function() {
      const user_et = new z.entity.User();
      user_et.name('John');
      expect(user_et.initials()).toBe('JO');
    });

    it('returns correct initials for user with middle name', function() {
      const user_et = new z.entity.User();
      user_et.name('John Peter Doe');
      expect(user_et.initials()).toBe('JD');
    });

    it('returns correct initials for user with one character as name', function() {
      const user_et = new z.entity.User();
      user_et.name('J');
      expect(user_et.initials()).toBe('J');
    });

    it('returns correct initials for user with an emoji as name', function() {
      const user_et = new z.entity.User();
      user_et.name('🐒');
      expect(user_et.initials()).toBe('🐒');
    });
  });

  describe('add_client', () =>
    it('accepts clients which are no duplicates', function() {
      const first_client = new z.client.Client();
      first_client.id = '5021d77752286cac';

      const second_client = new z.client.Client();
      second_client.id = '575b7a890cdb7635';

      const user_et = new z.entity.User();
      user_et.add_client(first_client);
      user_et.add_client(second_client);
      user_et.add_client(second_client);

      expect(user_et.devices().length).toBe(2);
    })
  );

  describe('accent_theme', () =>
    it('can change the accent theme', function() {
      const user_et = new z.entity.User();

      user_et.accent_id(z.config.ACCENT_ID.BLUE);
      expect(user_et.accent_theme()).toBe(z.entity.User.THEME.BLUE);

      user_et.accent_id(z.config.ACCENT_ID.GREEN);
      expect(user_et.accent_theme()).toBe(z.entity.User.THEME.GREEN);

      user_et.accent_id(z.config.ACCENT_ID.ORANGE);
      expect(user_et.accent_theme()).toBe(z.entity.User.THEME.ORANGE);

      user_et.accent_id(z.config.ACCENT_ID.PINK);
      expect(user_et.accent_theme()).toBe(z.entity.User.THEME.PINK);

      user_et.accent_id(z.config.ACCENT_ID.PURPLE);
      expect(user_et.accent_theme()).toBe(z.entity.User.THEME.PURPLE);

      user_et.accent_id(z.config.ACCENT_ID.RED);
      expect(user_et.accent_theme()).toBe(z.entity.User.THEME.RED);

      user_et.accent_id(z.config.ACCENT_ID.YELLOW);
      expect(user_et.accent_theme()).toBe(z.entity.User.THEME.YELLOW);

      user_et.accent_id(undefined);
      expect(user_et.accent_theme()).toBe(z.entity.User.THEME.BLUE);
    })
  );

  describe('accent_color', () =>
    it('can change the accent color', function() {
      const user_et = new z.entity.User();

      user_et.accent_id(z.config.ACCENT_ID.BLUE);
      expect(user_et.accent_color()).toBe(z.entity.User.ACCENT_COLOR.BLUE);

      user_et.accent_id(z.config.ACCENT_ID.GREEN);
      expect(user_et.accent_color()).toBe(z.entity.User.ACCENT_COLOR.GREEN);

      user_et.accent_id(z.config.ACCENT_ID.ORANGE);
      expect(user_et.accent_color()).toBe(z.entity.User.ACCENT_COLOR.ORANGE);

      user_et.accent_id(z.config.ACCENT_ID.PINK);
      expect(user_et.accent_color()).toBe(z.entity.User.ACCENT_COLOR.PINK);

      user_et.accent_id(z.config.ACCENT_ID.PURPLE);
      expect(user_et.accent_color()).toBe(z.entity.User.ACCENT_COLOR.PURPLE);

      user_et.accent_id(z.config.ACCENT_ID.RED);
      expect(user_et.accent_color()).toBe(z.entity.User.ACCENT_COLOR.RED);

      user_et.accent_id(z.config.ACCENT_ID.YELLOW);
      expect(user_et.accent_color()).toBe(z.entity.User.ACCENT_COLOR.YELLOW);

      user_et.accent_id(undefined);
      expect(user_et.accent_color()).toBe(z.entity.User.ACCENT_COLOR.BLUE);
    })
  );
});
