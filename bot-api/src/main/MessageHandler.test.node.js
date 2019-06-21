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
const {CONVERSATION_TYPING} = require('@wireapp/api-client/dist/commonjs/event');

const UUID = require('pure-uuid');
const UUID_VERSION = 4;

describe('MessageHandler', () => {
  let mainHandler;

  const MainHandler = class extends MessageHandler {
    constructor() {
      super();
    }
    async handleEvent() {}
  };

  beforeEach(async () => {
    mainHandler = new MainHandler();
    mainHandler.account = new Account();
    await mainHandler.account.init();
    mainHandler.account.apiClient.createContext('', '');

    spyOn(mainHandler.account.service.conversation, 'send').and.returnValue(Promise.resolve());
  });

  describe('"sendConnectionResponse"', () => {
    it('sends the correct data when accepting the connection', async () => {
      const userId = new UUID(UUID_VERSION).format();
      const acceptConnection = true;

      spyOn(mainHandler.account.service.connection, 'acceptConnection').and.returnValue(Promise.resolve());
      spyOn(mainHandler.account.service.connection, 'ignoreConnection').and.returnValue(Promise.resolve());

      await mainHandler.sendConnectionResponse(userId, acceptConnection);
      expect(mainHandler.account.service.connection.acceptConnection).toHaveBeenCalledWith(userId);
      expect(mainHandler.account.service.connection.ignoreConnection).not.toHaveBeenCalled();
    });

    it('sends the correct data when ignoring the connection', async () => {
      const userId = new UUID(UUID_VERSION).format();
      const acceptConnection = false;

      spyOn(mainHandler.account.service.connection, 'acceptConnection').and.returnValue(Promise.resolve());
      spyOn(mainHandler.account.service.connection, 'ignoreConnection').and.returnValue(Promise.resolve());

      await mainHandler.sendConnectionResponse(userId, acceptConnection);
      expect(mainHandler.account.service.connection.ignoreConnection).toHaveBeenCalledWith(userId);
      expect(mainHandler.account.service.connection.acceptConnection).not.toHaveBeenCalled();
    });
  });

  describe('"sendFile"', () => {
    it('sends the correct data', async () => {
      const conversationId = new UUID(UUID_VERSION).format();
      const file = new UUID(UUID_VERSION).format();
      const metadata = new UUID(UUID_VERSION).format();

      const filePayload = {
        data: file,
      };
      const metadataPayload = {
        id: new UUID(UUID_VERSION).format(),
      };

      spyOn(mainHandler.account.service.conversation.messageBuilder, 'createFileMetadata').and.returnValue(
        metadataPayload,
      );
      spyOn(mainHandler.account.service.conversation.messageBuilder, 'createFileData').and.returnValue(
        Promise.resolve(filePayload),
      );
      spyOn(mainHandler.account.service.conversation.messageBuilder, 'createFileAbort').and.returnValue(
        Promise.resolve(),
      );

      await mainHandler.sendFile(conversationId, file, metadata);
      expect(mainHandler.account.service.conversation.messageBuilder.createFileMetadata).toHaveBeenCalledWith(
        conversationId,
        metadata,
      );
      expect(mainHandler.account.service.conversation.messageBuilder.createFileData).toHaveBeenCalledWith(
        conversationId,
        file,
        metadataPayload.id,
      );
      expect(mainHandler.account.service.conversation.messageBuilder.createFileAbort).not.toHaveBeenCalled();
      expect(mainHandler.account.service.conversation.send).toHaveBeenCalledWith(filePayload);
    });

    it('sends the correct data if uploading fails', async () => {
      const conversationId = new UUID(UUID_VERSION).format();
      const file = new UUID(UUID_VERSION).format();
      const metadata = new UUID(UUID_VERSION).format();

      const abortPayload = {
        data: file,
      };
      const metadataPayload = {
        id: new UUID(UUID_VERSION).format(),
      };

      spyOn(mainHandler.account.service.conversation.messageBuilder, 'createFileMetadata').and.returnValue(
        metadataPayload,
      );
      spyOn(mainHandler.account.service.conversation.messageBuilder, 'createFileData').and.returnValue(
        Promise.reject(new Error()),
      );
      spyOn(mainHandler.account.service.conversation.messageBuilder, 'createFileAbort').and.returnValue(
        Promise.resolve(abortPayload),
      );

      await mainHandler.sendFile(conversationId, file, metadata);
      expect(mainHandler.account.service.conversation.messageBuilder.createFileMetadata).toHaveBeenCalledWith(
        conversationId,
        metadata,
      );
      expect(mainHandler.account.service.conversation.messageBuilder.createFileData).toHaveBeenCalledWith(
        conversationId,
        file,
        metadataPayload.id,
      );
      expect(mainHandler.account.service.conversation.send).toHaveBeenCalledWith(abortPayload);
    });
  });

  describe('"sendText"', () => {
    it('sends the correct data', async () => {
      const conversationId = new UUID(UUID_VERSION).format();
      const messageText = new UUID(UUID_VERSION).format();
      const mentionData = [
        {
          data: new UUID(UUID_VERSION).format(),
        },
      ];

      spyOn(mainHandler.account.service.conversation.messageBuilder, 'createText').and.callThrough();

      await mainHandler.sendText(conversationId, messageText, mentionData);

      expect(mainHandler.account.service.conversation.messageBuilder.createText).toHaveBeenCalledWith(
        conversationId,
        messageText,
      );
      expect(mainHandler.account.service.conversation.send).toHaveBeenCalledWith(
        jasmine.objectContaining({content: jasmine.objectContaining({mentions: mentionData, text: messageText})}),
        undefined,
      );
    });

    it('sends the correct data with mentions', async () => {
      const conversationId = new UUID(UUID_VERSION).format();
      const message = new UUID(UUID_VERSION).format();

      spyOn(mainHandler.account.service.conversation.messageBuilder, 'createText').and.callThrough();

      await mainHandler.sendText(conversationId, message);

      expect(mainHandler.account.service.conversation.messageBuilder.createText).toHaveBeenCalledWith(
        conversationId,
        message,
      );
      expect(mainHandler.account.service.conversation.send).toHaveBeenCalledWith(
        jasmine.objectContaining({content: jasmine.objectContaining({text: message})}),
        undefined,
      );
    });

    it('sends the correct data to target users', async () => {
      const conversationId = new UUID(UUID_VERSION).format();
      const message = new UUID(UUID_VERSION).format();
      const userIds = [new UUID(UUID_VERSION).format(), new UUID(UUID_VERSION).format()];

      spyOn(mainHandler.account.service.conversation.messageBuilder, 'createText').and.callThrough();

      await mainHandler.sendText(conversationId, message, undefined, undefined, userIds);

      expect(mainHandler.account.service.conversation.messageBuilder.createText).toHaveBeenCalledWith(
        conversationId,
        message,
      );
      expect(mainHandler.account.service.conversation.send).toHaveBeenCalledWith(
        jasmine.objectContaining({content: jasmine.objectContaining({text: message})}),
        userIds,
      );
    });
  });

  describe('"sendTyping"', () => {
    it('sends the correct data when typing started', async () => {
      const conversationId = new UUID(UUID_VERSION).format();

      spyOn(mainHandler.account.service.conversation, 'sendTypingStart').and.returnValue(Promise.resolve());
      spyOn(mainHandler.account.service.conversation, 'sendTypingStop').and.returnValue(Promise.resolve());

      await mainHandler.sendTyping(conversationId, CONVERSATION_TYPING.STARTED);

      expect(mainHandler.account.service.conversation.sendTypingStart).toHaveBeenCalled();
      expect(mainHandler.account.service.conversation.sendTypingStop).not.toHaveBeenCalled();
    });

    it('sends the correct data when typing stopped', async () => {
      const conversationId = new UUID(UUID_VERSION).format();

      spyOn(mainHandler.account.service.conversation, 'sendTypingStart').and.returnValue(Promise.resolve());
      spyOn(mainHandler.account.service.conversation, 'sendTypingStop').and.returnValue(Promise.resolve());

      await mainHandler.sendTyping(conversationId, CONVERSATION_TYPING.STOPPED);

      expect(mainHandler.account.service.conversation.sendTypingStart).not.toHaveBeenCalled();
      expect(mainHandler.account.service.conversation.sendTypingStop).toHaveBeenCalled();
    });
  });
});
