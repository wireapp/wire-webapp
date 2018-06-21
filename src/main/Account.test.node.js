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

const {Account} = require('@wireapp/core');

describe('Account', () => {
  describe('"init"', () => {
    it('initializes the Protocol buffers', async done => {
      const account = new Account();

      expect(account.service).not.toBeDefined();
      expect(account.protocolBuffers.GenericMessage).not.toBeDefined();

      await account.init();

      expect(account.service.conversation).toBeDefined();
      expect(account.service.cryptography).toBeDefined();

      const message = account.protocolBuffers.GenericMessage.create({
        messageId: '2d7cb6d8-118f-11e8-b642-0ed5f89f718b',
        text: account.protocolBuffers.Text.create({content: 'Hello, World!'}),
      });

      expect(message.content).toBe('text');
      done();
    });
  });
});
