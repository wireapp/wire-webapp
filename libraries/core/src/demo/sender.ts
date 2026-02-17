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

/* eslint-disable no-inner-declarations */

process.on('uncaughtException', error =>
  console.error(`Uncaught exception "${error.constructor.name}": ${error.message}`, error),
);
process.on('unhandledRejection', (reason, promise) =>
  console.error('Unhandled Rejection at:', promise, 'reason:', reason),
);

import {program as commander} from 'commander';
import logdown from 'logdown';
import * as fs from 'fs';
import * as path from 'path';
import {promisify} from 'util';
import {TimeUtil} from '@wireapp/commons';
import {Account} from '@wireapp/core';
import {APIClient} from '@wireapp/api-client';
import {ClientType} from '@wireapp/api-client/lib/client/';
import {FileEngine} from '@wireapp/store-engine-fs';
import {MessageBuilder} from '../main/conversation/message/MessageBuilder';

const readFileAsync = promisify(fs.readFile);

commander.option('-c, --conversationId <conversationId>').parse(process.argv);

require(`dotenv-defaults`).config({
  path: path.join(__dirname, 'sender.env'),
  quiet: true,
});

const logger = logdown('@wireapp/core/src/demo/sender.ts', {
  logger: console,
  markdown: false,
});
logger.state.isEnabled = true;

const {
  WIRE_EMAIL,
  WIRE_PASSWORD,
  WIRE_CONVERSATION_ID = commander.opts().conversationId,
  WIRE_BACKEND = 'staging',
} = process.env;

(async () => {
  const MESSAGE_TIMER = TimeUtil.TimeInMillis.SECOND * 5;
  const useProtobuf = false;

  ['WIRE_EMAIL', 'WIRE_PASSWORD', 'WIRE_CONVERSATION_ID', 'WIRE_BACKEND'].forEach((envVar, _, array) => {
    if (!process.env[envVar]) {
      logger.error(`Error: Environment variable "${envVar}" is not set. Required variables: ${array.join(', ')}.`);
      process.exit(1);
    }
  });

  const login = {
    clientType: ClientType.TEMPORARY,
    email: WIRE_EMAIL,
    password: WIRE_PASSWORD,
  };

  const backend = WIRE_BACKEND === 'staging' ? APIClient.BACKEND.STAGING : APIClient.BACKEND.PRODUCTION;
  const engine = new FileEngine(path.join(__dirname, '.tmp/sender'));
  await engine.init('sender', {fileExtension: '.json'});

  const apiClient = new APIClient({urls: backend});
  const account = new Account(apiClient, {createStore: () => Promise.resolve(engine)});
  await account.login(login);
  await account.listen();

  account.on(Account.TOPIC.ERROR, error => logger.error(error));

  const name = await account.service!.self.getName();

  logger.log('Name', name);
  logger.log('User ID', account['apiClient'].context!.userId);
  logger.log('Client ID', account['apiClient'].context!.clientId);

  async function sendAndDeleteMessage(): Promise<void> {
    const deleteTextPayload = MessageBuilder.createText({
      conversationId: WIRE_CONVERSATION_ID,
      from: account.userId,
      text: 'Delete me!',
    }).build();
    const {id: messageId} = await account.service!.conversation.send({
      payloadBundle: deleteTextPayload,
      sendAsProtobuf: useProtobuf,
    });

    const fiveSecondsInMillis = TimeUtil.TimeInMillis.SECOND * 5;
    setTimeout(async () => {
      await account.service!.conversation.deleteMessageEveryone(WIRE_CONVERSATION_ID, messageId);
    }, fiveSecondsInMillis);
  }

  async function sendConversationLevelTimer(timeInMillis = TimeUtil.TimeInMillis.YEAR): Promise<void> {
    await account['apiClient'].conversation.api.putConversationMessageTimer(WIRE_CONVERSATION_ID, {
      message_timer: timeInMillis,
    });
  }

  async function sendEphemeralText(expiry = MESSAGE_TIMER): Promise<void> {
    account.service!.conversation.messageTimer.setMessageLevelTimer(WIRE_CONVERSATION_ID, expiry);
    const payload = MessageBuilder.createText({
      conversationId: WIRE_CONVERSATION_ID,
      from: account.userId,
      text: `Expires after ${expiry}ms ...`,
    }).build();
    await account.service!.conversation.send({payloadBundle: payload, sendAsProtobuf: useProtobuf});
    account.service!.conversation.messageTimer.setMessageLevelTimer(WIRE_CONVERSATION_ID, 0);
  }

  async function sendPing(expiry = MESSAGE_TIMER): Promise<void> {
    account.service!.conversation.messageTimer.setMessageLevelTimer(WIRE_CONVERSATION_ID, expiry);
    const payload = MessageBuilder.createPing(WIRE_CONVERSATION_ID);
    await account.service!.conversation.send({payloadBundle: payload, sendAsProtobuf: useProtobuf});
    account.service!.conversation.messageTimer.setMessageLevelTimer(WIRE_CONVERSATION_ID, 0);
  }

  async function sendText(): Promise<void> {
    const payload = MessageBuilder.createText({
      conversationId: WIRE_CONVERSATION_ID,
      from: account.userId,
      text: 'Hello, World!',
    }).build();
    await account.service!.conversation.send({payloadBundle: payload, sendAsProtobuf: useProtobuf});
  }

  async function sendAndEdit(): Promise<void> {
    const payload = MessageBuilder.createText({
      conversationId: WIRE_CONVERSATION_ID,
      from: account.userId,
      text: 'Hello, Wolrd!',
    }).build();
    const {id: originalMessageId} = await account.service!.conversation.send({
      payloadBundle: payload,
      sendAsProtobuf: useProtobuf,
    });
    setInterval(async () => {
      const editedPayload = MessageBuilder.createEditedText({
        conversationId: WIRE_CONVERSATION_ID,
        from: account.userId,
        newMessageText: 'Hello, World!',
        originalMessageId,
      }).build();
      await account.service!.conversation.send({payloadBundle: editedPayload, sendAsProtobuf: useProtobuf});
    }, TimeUtil.TimeInMillis.SECOND * 2);
  }

  async function sendImage(): Promise<void> {
    const data = await readFileAsync(path.join(__dirname, 'wire_logo.png'));
    const image = {
      data,
      height: 244,
      type: 'image/png',
      width: 500,
    };
    const imagePayload = MessageBuilder.createImage({
      conversationId: WIRE_CONVERSATION_ID,
      from: account.userId,
      image,
      asset: await (await account.service!.asset.uploadAsset(image.data)).response,
    });
    await account.service!.conversation.send({payloadBundle: imagePayload, sendAsProtobuf: useProtobuf});
  }

  async function sendFile(): Promise<void> {
    const filename = 'wire_logo.png';
    const data = await readFileAsync(path.join(__dirname, filename));
    const metadataPayload = MessageBuilder.createFileMetadata({
      conversationId: WIRE_CONVERSATION_ID,
      from: account.userId,
      metaData: {
        length: data.length,
        name: filename,
        type: 'image/png',
      },
    });
    await account.service!.conversation.send({payloadBundle: metadataPayload, sendAsProtobuf: useProtobuf});

    const file = {data};
    const filePayload = await MessageBuilder.createFileData({
      from: account.userId,
      conversationId: WIRE_CONVERSATION_ID,
      file,
      asset: await (await account.service.asset.uploadAsset(file.data)).response,
      originalMessageId: metadataPayload.id,
    });
    await account.service!.conversation.send({payloadBundle: filePayload, sendAsProtobuf: useProtobuf});
  }

  async function clearConversation(): Promise<void> {
    await account.service!.conversation.clearConversation(WIRE_CONVERSATION_ID);
  }

  async function sendMentions(): Promise<void> {
    const conversation = await account.service!.conversation.getConversations(WIRE_CONVERSATION_ID);
    const userIds = conversation.members.others.map(participant => participant.id);
    const users = await account.service!.user.getUsers(userIds);

    let text = 'Hello';

    const mentions = users.map(user => {
      text += ' ';
      const mentionText = `@${user.name}`;
      const mention = {
        length: mentionText.length,
        start: text.length,
        userId: user.id,
      };
      text += mentionText;
      return mention;
    });

    const payload = MessageBuilder.createText({conversationId: WIRE_CONVERSATION_ID, from: account.userId, text})
      .withMentions(mentions)
      .build();

    await account.service!.conversation.send({payloadBundle: payload, sendAsProtobuf: useProtobuf});
  }

  async function sendQuote(): Promise<void> {
    const text = 'Hello';

    const textPayload = MessageBuilder.createText({
      conversationId: WIRE_CONVERSATION_ID,
      from: account.userId,
      text,
    }).build();

    const {id: messageId} = await account.service!.conversation.send({
      payloadBundle: textPayload,
      sendAsProtobuf: useProtobuf,
    });

    const quoteText = 'Hello again';

    const quote = {
      content: textPayload.content,
      quotedMessageId: messageId,
    };

    const quotePayload = MessageBuilder.createText({
      conversationId: WIRE_CONVERSATION_ID,
      from: account.userId,
      text: quoteText,
    })
      .withQuote(quote)
      .build();

    await account.service!.conversation.send({payloadBundle: quotePayload, sendAsProtobuf: useProtobuf});
  }

  const methods = [
    sendAndDeleteMessage,
    sendAndEdit,
    sendEphemeralText,
    sendFile,
    sendImage,
    sendMentions,
    sendPing,
    sendQuote,
    sendText,
  ];

  const twoSeconds = TimeUtil.TimeInMillis.SECOND * 2;
  setInterval(async () => {
    const randomMethod = methods[Math.floor(Math.random() * methods.length)];
    await randomMethod();
  }, twoSeconds);
})().catch(error => console.error(error));
