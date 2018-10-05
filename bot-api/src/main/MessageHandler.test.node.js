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

const {MessageHandler} = require('@wireapp/bot-api');
const {Account} = require('@wireapp/core');
const UUID = require('pure-uuid');
const UUID_VERSION = 4;

describe('MessageHandler', () => {
  let mainHandler;

  beforeEach(() => {
    mainHandler = new MessageHandler();
  });

  describe('"sendImage"', () => {
    it('calls send() with account and service', async () => {
      mainHandler.account = new Account();
      await mainHandler.account.init();

      const imagePayload = {
        data: new UUID(UUID_VERSION).format(),
      };

      const image = {
        data: new UUID(UUID_VERSION).format(),
      };

      spyOn(mainHandler.account.service.conversation, 'send').and.returnValue(Promise.resolve());
      spyOn(mainHandler.account.service.conversation, 'createImage').and.returnValue(Promise.resolve(imagePayload));

      await mainHandler.sendImage('random-id', image);
      expect(mainHandler.account.service.conversation.createImage).toHaveBeenCalledWith(image);
      expect(mainHandler.account.service.conversation.send).toHaveBeenCalledWith('random-id', imagePayload);
    });
  });
});
