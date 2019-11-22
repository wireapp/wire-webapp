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

//@ts-check

process.on('uncaughtException', (/** @type {Error & {code: number}} */ error) =>
  logger.error(`Uncaught exception "${error.constructor.name}" (${error.code}): ${error.message}`, error),
);
process.on('unhandledRejection', (reason, promise) =>
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason),
);

const path = require('path');
const logdown = require('logdown');

const {Account} = require('@wireapp/core');
const {PayloadBundleType} = require('@wireapp/core/dist/conversation/');
const {APIClient} = require('@wireapp/api-client');
const {WebSocketClient} = require('@wireapp/api-client/dist/tcp/');
const {ClientType} = require('@wireapp/api-client/dist/client/ClientType');
const {ConnectionStatus} = require('@wireapp/api-client/dist/connection/');
const {CONVERSATION_TYPING} = require('@wireapp/api-client/dist/conversation/data/');
const {MemoryEngine} = require('@wireapp/store-engine/dist/commonjs/engine/');
const {LegalHoldStatus} = require('@wireapp/protocol-messaging');
const dotenv = require('dotenv');

const logger = logdown('@wireapp/core/demo/echo.js', {
  logger: console,
  markdown: false,
});
logger.state.isEnabled = true;

dotenv.config({path: path.join(__dirname, 'echo.env')});

const assetOriginalCache = {};
const messageIdCache = {};

(async () => {
  const login = {
    clientType: ClientType.TEMPORARY,
    email: process.env.WIRE_EMAIL,
    password: process.env.WIRE_PASSWORD,
  };

  const backend = process.env.WIRE_BACKEND === 'staging' ? APIClient.BACKEND.STAGING : APIClient.BACKEND.PRODUCTION;
  const engine = new MemoryEngine();
  await engine.init('receiver');

  const apiClient = new APIClient({store: engine, urls: backend});
  const account = new Account(apiClient);

  const handleIncomingMessage = async messageData => {
    const CONFIRM_TYPES = [
      PayloadBundleType.ASSET,
      PayloadBundleType.ASSET_IMAGE,
      PayloadBundleType.LOCATION,
      PayloadBundleType.PING,
      PayloadBundleType.TEXT,
    ];
    const {content, conversation: conversationId, from, id: messageId, messageTimer = 0, type} = messageData;
    const additionalContent = [];

    if (content.mentions && content.mentions.length) {
      additionalContent.push(`mentioning "${content.mentions.map(mention => mention.userId).join(',')}"`);
    }

    if (content.quote) {
      additionalContent.push(`quoting "${content.quote.quotedMessageId}"`);
    }

    if (messageTimer) {
      additionalContent.push(`(ephemeral message, ${messageTimer} ms timeout)`);
    }

    if (content.expectsReadConfirmation) {
      additionalContent.push('(expecting read confirmation)');
    }

    if (content.legalHoldStatus === LegalHoldStatus.ENABLED) {
      additionalContent.push('(sent to legal hold)');
    }

    logger.log(
      `Receiving: "${type}" ("${messageId}") in "${conversationId}" from "${from}" ${additionalContent.join(' ')}`,
    );

    if (CONFIRM_TYPES.includes(type)) {
      const deliveredPayload = account.service.conversation.messageBuilder.createConfirmation(
        conversationId,
        messageId,
        0,
      );
      logger.log(
        `Sending: "${deliveredPayload.type}" ("${deliveredPayload.id}") in "${conversationId}"`,
        deliveredPayload.content,
      );
      await account.service.conversation.send(deliveredPayload);

      if (content.expectsReadConfirmation) {
        const readPayload = account.service.conversation.messageBuilder.createConfirmation(
          conversationId,
          messageId,
          1,
        );
        logger.log(`Sending: "${readPayload.type}" ("${readPayload.id}") in "${conversationId}"`, readPayload.content);
        await account.service.conversation.send(readPayload);
      }

      if (messageTimer) {
        logger.log(
          `Sending: "PayloadBundleType.MESSAGE_DELETE" in "${conversationId}" for "${messageId}" (encrypted for "${from}")`,
        );
        await account.service.conversation.deleteMessageEveryone(conversationId, messageId, [from]);
      }
    }
  };

  const sendMessageResponse = async (data, payload) => {
    const {content, id: messageId, messageTimer = 0, type} = payload;
    const conversationId = data.conversation;

    logger.log(
      `Sending: "${type}" ("${messageId}") in "${conversationId}"`,
      content,
      messageTimer ? `(ephemeral message, ${messageTimer} ms timeout)` : '',
    );

    account.service.conversation.messageTimer.setMessageLevelTimer(conversationId, messageTimer);
    await account.service.conversation.send(payload);
    account.service.conversation.messageTimer.setMessageLevelTimer(conversationId, 0);
  };

  const buildLinkPreviews = async originalLinkPreviews => {
    const newLinkPreviews = [];
    for (const originalLinkPreview of originalLinkPreviews) {
      const originalLinkPreviewImage =
        originalLinkPreview.article && originalLinkPreview.article.image
          ? originalLinkPreview.article.image
          : originalLinkPreview.image;
      let linkPreviewImage;

      if (originalLinkPreviewImage) {
        const imageBuffer = await account.service.conversation.getAsset(originalLinkPreviewImage.uploaded);

        linkPreviewImage = {
          data: imageBuffer,
          height: originalLinkPreviewImage.original.image.height,
          type: originalLinkPreviewImage.original.mimeType,
          width: originalLinkPreviewImage.original.image.width,
        };
      }

      const newLinkPreview = await account.service.conversation.messageBuilder.createLinkPreview({
        ...originalLinkPreview,
        image: linkPreviewImage,
      });

      newLinkPreviews.push(newLinkPreview);
    }
    return newLinkPreviews;
  };

  apiClient.transport.ws.on(WebSocketClient.TOPIC.ON_OFFLINE, () => logger.info('API Client is offline'));

  apiClient.transport.ws.on(WebSocketClient.TOPIC.ON_ONLINE, () => logger.info('API Client is online'));

  account.on(PayloadBundleType.TEXT, async data => {
    const {
      content: {expectsReadConfirmation, legalHoldStatus, linkPreviews, mentions, quote, text},
      conversation: conversationId,
      id: messageId,
    } = data;
    let textPayload;

    if (linkPreviews && linkPreviews.length) {
      const newLinkPreviews = await buildLinkPreviews(linkPreviews);

      await handleIncomingMessage(data);

      const cachedMessageId = messageIdCache[messageId];

      if (!cachedMessageId) {
        logger.warn(`Link preview for message ID "${messageId} was received before the original message."`);
        return;
      }

      textPayload = account.service.conversation.messageBuilder
        .createText(conversationId, text, cachedMessageId)
        .withLinkPreviews(newLinkPreviews)
        .withMentions(mentions)
        .withQuote(quote)
        .withReadConfirmation(expectsReadConfirmation)
        .withLegalHoldStatus(legalHoldStatus)
        .build();
    } else {
      await handleIncomingMessage(data);
      textPayload = account.service.conversation.messageBuilder
        .createText(conversationId, text)
        .withMentions(mentions)
        .withQuote(quote)
        .withReadConfirmation(expectsReadConfirmation)
        .withLegalHoldStatus(legalHoldStatus)
        .build();
    }

    messageIdCache[messageId] = textPayload.id;

    await sendMessageResponse(data, textPayload);
  });

  account.on(PayloadBundleType.CONFIRMATION, handleIncomingMessage);

  account.on(PayloadBundleType.ASSET, async data => {
    const {content, conversation: conversationId, id: messageId} = data;

    const cacheOriginal = assetOriginalCache[messageId];
    if (!cacheOriginal) {
      logger.warn(`Uploaded data for message ID "${messageId} was received before the metadata."`);
      return;
    }

    const fileBuffer = await account.service.conversation.getAsset(content.uploaded);

    await handleIncomingMessage(data);

    const fileMetaDataPayload = await account.service.conversation.messageBuilder.createFileMetadata(conversationId, {
      length: fileBuffer.length,
      name: cacheOriginal.name,
      type: cacheOriginal.mimeType,
    });

    await sendMessageResponse(data, fileMetaDataPayload);

    try {
      const filePayload = await account.service.conversation.messageBuilder.createFileData(
        conversationId,
        {data: fileBuffer},
        fileMetaDataPayload.id,
      );
      messageIdCache[messageId] = filePayload.id;
      await sendMessageResponse(data, filePayload);
    } catch (error) {
      logger.warn(`Error while sending asset: "${error.stack}"`);
      const fileAbortPayload = await account.service.conversation.messageBuilder.createFileAbort(
        conversationId,
        0,
        fileMetaDataPayload.id,
      );
      await sendMessageResponse(data, fileAbortPayload);
    }
  });

  account.on(PayloadBundleType.ASSET_META, async data => {
    const {
      content: {original},
      id: messageId,
    } = data;

    assetOriginalCache[messageId] = original;

    await handleIncomingMessage(data);
  });

  account.on(PayloadBundleType.ASSET_ABORT, async data => {
    const {conversation: conversationId, id: messageId} = data;

    await handleIncomingMessage(data);

    const cacheOriginal = assetOriginalCache[messageId];
    if (!cacheOriginal) {
      logger.warn(`Asset abort message for message ID "${messageId} was received before the metadata."`);
      return;
    }

    const fileMetaDataPayload = await account.service.conversation.messageBuilder.createFileMetadata(conversationId, {
      length: 0,
      name: cacheOriginal.name,
      type: cacheOriginal.mimeType,
    });

    await handleIncomingMessage(data);
    await sendMessageResponse(data, fileMetaDataPayload);

    const fileAbortPayload = await account.service.conversation.messageBuilder.createFileAbort(
      conversationId,
      0,
      fileMetaDataPayload.id,
    );
    await sendMessageResponse(data, fileAbortPayload);

    delete assetOriginalCache[messageId];
    delete messageIdCache[messageId];
  });

  account.on(PayloadBundleType.ASSET_IMAGE, async data => {
    const {
      content: {uploaded, original},
      conversation: conversationId,
      id: messageId,
    } = data;

    const imageBuffer = await account.service.conversation.getAsset(uploaded);

    const imagePayload = await account.service.conversation.messageBuilder.createImage(conversationId, {
      data: imageBuffer,
      height: original.image.height,
      type: original.mimeType,
      width: original.image.width,
    });

    messageIdCache[messageId] = imagePayload.id;

    await handleIncomingMessage(data);
    await sendMessageResponse(data, imagePayload);
  });

  account.on(PayloadBundleType.CALL, async data => {
    logger.info(`Received calling payload`, JSON.parse(data.content));
  });

  account.on(PayloadBundleType.CONVERSATION_CLEAR, handleIncomingMessage);

  account.on(PayloadBundleType.LOCATION, async data => {
    const {content, conversation: conversationId} = data;
    const locationPayload = account.service.conversation.messageBuilder.createLocation(conversationId, content);

    await handleIncomingMessage(data);
    await sendMessageResponse(data, locationPayload);
  });

  account.on(PayloadBundleType.PING, async data => {
    const {
      content: {expectsReadConfirmation, legalHoldStatus},
      conversation: conversationId,
    } = data;
    await handleIncomingMessage(data);

    const pingPayload = account.service.conversation.messageBuilder.createPing(conversationId, {
      expectsReadConfirmation,
      legalHoldStatus,
    });

    await sendMessageResponse(data, pingPayload);
  });

  account.on(PayloadBundleType.REACTION, async data => {
    const {
      content: {legalHoldStatus, originalMessageId, type},
      conversation: conversationId,
    } = data;

    await handleIncomingMessage(data);

    const reactionPayload = account.service.conversation.messageBuilder.createReaction(conversationId, {
      legalHoldStatus,
      originalMessageId,
      type,
    });

    await sendMessageResponse(data, reactionPayload);
  });

  account.on(PayloadBundleType.TYPING, async data => {
    const {
      conversation: conversationId,
      data: {status},
    } = data;

    await handleIncomingMessage(data);

    if (status === CONVERSATION_TYPING.STARTED) {
      await account.service.conversation.sendTypingStart(conversationId);
    } else {
      await account.service.conversation.sendTypingStop(conversationId);
    }
  });

  account.on(PayloadBundleType.MESSAGE_DELETE, async data => {
    const {
      content: {originalMessageId},
      conversation: conversationId,
    } = data;

    await handleIncomingMessage(data);

    if (messageIdCache[originalMessageId]) {
      await account.service.conversation.deleteMessageEveryone(conversationId, messageIdCache[originalMessageId]);

      delete messageIdCache[originalMessageId];
    }
  });

  account.on(PayloadBundleType.MESSAGE_EDIT, async data => {
    const {
      content: {expectsReadConfirmation, legalHoldStatus, linkPreviews, mentions, originalMessageId, quote, text},
      conversation: conversationId,
      id: messageId,
    } = data;
    let editedPayload;

    const cachedOriginalMessageId = messageIdCache[originalMessageId];

    if (!cachedOriginalMessageId) {
      logger.warn(`Edited message for message ID "${messageId} was received before the original message."`);
      return;
    }

    if (linkPreviews) {
      const newLinkPreviews = await buildLinkPreviews(linkPreviews);

      await handleIncomingMessage(data);

      const cachedMessageId = messageIdCache[messageId];

      if (!cachedMessageId) {
        logger.warn(`Link preview for edited message ID "${messageId} was received before the original message."`);
        return;
      }
      editedPayload = account.service.conversation.messageBuilder
        .createEditedText(conversationId, text, cachedOriginalMessageId, cachedMessageId)
        .withLinkPreviews(newLinkPreviews)
        .withMentions(mentions)
        .withQuote(quote)
        .withReadConfirmation(expectsReadConfirmation)
        .withLegalHoldStatus(legalHoldStatus)
        .build();
    } else {
      await handleIncomingMessage(data);
      editedPayload = account.service.conversation.messageBuilder
        .createEditedText(conversationId, text, cachedOriginalMessageId)
        .withMentions(mentions)
        .withQuote(quote)
        .withReadConfirmation(expectsReadConfirmation)
        .withLegalHoldStatus(legalHoldStatus)
        .build();
    }

    messageIdCache[messageId] = editedPayload.id;

    await sendMessageResponse(data, editedPayload);
  });

  account.on(PayloadBundleType.MESSAGE_HIDE, handleIncomingMessage);

  account.on(PayloadBundleType.CONNECTION_REQUEST, async data => {
    await handleIncomingMessage(data);
    if (data.content.status === ConnectionStatus.PENDING) {
      await account.service.connection.acceptConnection(data.content.to);
    }
  });

  account.on(PayloadBundleType.CLIENT_ADD, async data => {
    logger.log(`User added client with ID "${data.content.client.id}"`, data);
  });

  account.on(PayloadBundleType.CLIENT_REMOVE, async data => {
    logger.log(`User removed client with ID "${data.content.client.id}"`, data);
  });

  try {
    logger.log('Logging in ...');
    await account.login(login);
    await account.listen();

    account.on('error', error => logger.error(error));

    const name = await account.service.self.getName();

    logger.log('Name', name);
    logger.log('User ID', account.apiClient.context.userId);
    logger.log('Client ID', account.apiClient.context.clientId);
    logger.log('Listening for messages ...');
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
})();
