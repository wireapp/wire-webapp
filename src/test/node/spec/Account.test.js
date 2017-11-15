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

const {Account} = require('@wireapp/core');

describe('Account', () => {
  describe('"constructor"', () => {
    it('creates a temporary client by default', () => {
      const account = new Account({email: 'me@wire.com', password: 'secret'});
      expect(account.loginData.persist).toBe(false);
    });

    it('sanitizes login data', () => {
      const account = new Account({email: 'me@wire.com\t', password: '\r\nsecret'});
      expect(account.loginData.email).toBe('me@wire.com');
      expect(account.loginData.password).toBe('secret');
    });

    it('turns a given password into a string', () => {
      const account = new Account({email: 'me@wire.com\t', password: 1234567890});
      expect(typeof account.loginData.password).toBe('string');
    });
  });
});
