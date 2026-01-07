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

import * as path from 'path';
import * as logdown from 'logdown';
import {Account} from '@wireapp/core';
import {PayloadBundleType} from '@wireapp/core/lib/conversation/';
import {APIClient} from '@wireapp/api-client';
import {WebSocketClient} from '@wireapp/api-client/lib/tcp/';
import {ClientType} from '@wireapp/api-client/lib/client/ClientType';
import {ConnectionStatus} from '@wireapp/api-client/lib/connection/';
import {CONVERSATION_TYPING} from '@wireapp/api-client/lib/conversation/data/';
import {LegalHoldStatus, Confirmation} from '@wireapp/protocol-messaging';
import {AssetContent} from '../main/conversation/content/AssetContent';
import {LinkPreviewUploadedContent} from '../main/conversation/content';
import {MessageBuilder} from '../main/conversation/message/MessageBuilder';
import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';

const logger = logdown('@wireapp/core/demo/echo.js', {
  logger: console,
  markdown: false,
});
logger.state.isEnabled = true;

process.on('uncaughtException', error =>
  logger.error(`Uncaught exception "${error.constructor.name}": ${error.message}`, error),
);
process.on('unhandledRejection', (reason, promise) =>
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason),
);

require(`dotenv-defaults`).config({
  path: path.join(__dirname, 'echo.env'),
});

const assetOriginalCache = {};
const messageIdCache = {};

const {WIRE_EMAIL, WIRE_PASSWORD, WIRE_BACKEND = 'staging'} = process.env;

(async () => {
  ['WIRE_EMAIL', 'WIRE_PASSWORD', 'WIRE_BACKEND'].forEach((envVar, _, array) => {
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

  const apiClient = new APIClient({urls: backend});
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
      const deliveredPayload = MessageBuilder.createConfirmation({
        conversationId,
        from: account.userId,
        firstMessageId: messageId,
        type: Confirmation.Type.DELIVERED,
      });
      logger.log(
        `Sending: "${deliveredPayload.type}" ("${deliveredPayload.id}") in "${conversationId}"`,
        deliveredPayload.content,
      );
      await account.service?.conversation.send({
        protocol: ConversationProtocol.PROTEUS,
        payload: deliveredPayload,
      });

      if (content.expectsReadConfirmation) {
        const readPayload = MessageBuilder.createConfirmation({
          conversationId,
          from: account.userId,
          firstMessageId: messageId,
          type: Confirmation.Type.READ,
        });
        logger.log(`Sending: "${readPayload.type}" ("${readPayload.id}") in "${conversationId}"`, readPayload.content);
        await account.service?.conversation.send({protocol: ConversationProtocol.PROTEUS, payload: readPayload});
      }

      if (messageTimer) {
        logger.log(
          `Sending: "PayloadBundleType.MESSAGE_DELETE" in "${conversationId}" for "${messageId}" (encrypted for "${from}")`,
        );
        await account.service?.conversation.deleteMessageEveryone(conversationId, messageId, [from]);
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

    account.service?.conversation.messageTimer.setMessageLevelTimer(conversationId, messageTimer);
    await account.service?.conversation.send({protocol: ConversationProtocol.PROTEUS, payload});
    account.service?.conversation.messageTimer.setMessageLevelTimer(conversationId, 0);
  };

  const buildLinkPreviews = async originalLinkPreviews => {
    const newLinkPreviews: LinkPreviewUploadedContent[] = [];
    for (const originalLinkPreview of originalLinkPreviews) {
      const originalLinkPreviewImage =
        originalLinkPreview.article && originalLinkPreview.article.image
          ? originalLinkPreview.article.image
          : originalLinkPreview.image;
      let linkPreviewImage;

      if (originalLinkPreviewImage) {
        const imageBuffer = await account.service?.conversation.getAsset(originalLinkPreviewImage.uploaded);

        linkPreviewImage = {
          data: imageBuffer,
          height: originalLinkPreviewImage.original.image.height,
          type: originalLinkPreviewImage.original.mimeType,
          width: originalLinkPreviewImage.original.image.width,
        };
        linkPreviewImage = await account.service?.linkPreview.uploadLinkPreviewImage(linkPreviewImage);
      }

      newLinkPreviews.push({...originalLinkPreview, imageUploaded: linkPreviewImage});
    }
    return newLinkPreviews;
  };

  apiClient.transport.ws.on(WebSocketClient.TOPIC.ON_STATE_CHANGE, () => logger.info('API Client state changed'));

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

      textPayload = MessageBuilder.createText({
        conversationId,
        text,
        from: account.userId,
        messageId: cachedMessageId,
      })
        .withLinkPreviews(newLinkPreviews)
        .withMentions(mentions)
        .withQuote(quote)
        .withReadConfirmation(expectsReadConfirmation)
        .withLegalHoldStatus(legalHoldStatus)
        .build();
    } else {
      await handleIncomingMessage(data);
      textPayload = MessageBuilder.createText({conversationId, from: account.userId, text})
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

    const fileBuffer = await account.service?.conversation.getAsset((content as AssetContent).uploaded);

    await handleIncomingMessage(data);

    const fileMetaDataPayload = MessageBuilder.createFileMetadata({
      conversationId,
      from: account.userId,
      metaData: {
        length: fileBuffer?.length ?? 0,
        name: cacheOriginal.name,
        type: cacheOriginal.mimeType,
      },
    });

    await sendMessageResponse(data, fileMetaDataPayload);

    try {
      const file = {data: fileBuffer};
      const asset = await (await account.service!.asset.uploadAsset(file.data)).response;
      const filePayload = MessageBuilder.createFileData({
        conversationId,
        from: account.userId,
        asset,
        file,
        originalMessageId: fileMetaDataPayload.id,
      });
      messageIdCache[messageId] = filePayload.id;
      await sendMessageResponse(data, filePayload);
    } catch (error) {
      logger.warn(`Error while sending asset: "${error.stack}"`);
      const fileAbortPayload = MessageBuilder.createFileAbort({
        conversationId,
        from: account.userId,
        reason: 0,
        originalMessageId: fileMetaDataPayload.id,
      });
      await sendMessageResponse(data, fileAbortPayload);
    }
  });

  account.on(PayloadBundleType.ASSET_META, async data => {
    const {
      content: {metaData},
      id: messageId,
    } = data;

    assetOriginalCache[messageId] = metaData;

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

    const fileMetaDataPayload = MessageBuilder.createFileMetadata({
      conversationId,
      from: account.userId,
      metaData: {
        length: 0,
        name: cacheOriginal.name,
        type: cacheOriginal.mimeType,
      },
    });

    await handleIncomingMessage(data);
    await sendMessageResponse(data, fileMetaDataPayload);

    const fileAbortPayload = MessageBuilder.createFileAbort({
      conversationId,
      from: account.userId,
      reason: 0,
      originalMessageId: fileMetaDataPayload.id,
    });
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

    if (!uploaded) {
      throw new Error('asset not yet uploaded');
    }
    const imageBuffer = await account.service.conversation.getAsset(uploaded);

    const image = {
      data: imageBuffer,
      height: original.image.height,
      type: original.mimeType,
      width: original.image.width,
    };
    const asset = await (await account.service!.asset.uploadAsset(image.data)).response;
    const imagePayload = MessageBuilder.createImage({
      conversationId,
      from: account.userId,
      image,
      asset,
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
    const locationPayload = MessageBuilder.createLocation({
      conversationId,
      from: account.userId,
      location: content,
    });

    await handleIncomingMessage(data);
    await sendMessageResponse(data, locationPayload);
  });

  account.on(PayloadBundleType.PING, async data => {
    const {
      content: {expectsReadConfirmation, legalHoldStatus},
      conversation: conversationId,
    } = data;
    await handleIncomingMessage(data);

    const pingPayload = MessageBuilder.createPing({
      conversationId,
      from: account.userId,
      ping: {
        expectsReadConfirmation,
        hotKnock: false,
        legalHoldStatus,
      },
    });

    await sendMessageResponse(data, pingPayload);
  });

  account.on(PayloadBundleType.REACTION, async data => {
    const {
      content: {legalHoldStatus, originalMessageId, type},
      conversation: conversationId,
    } = data;

    await handleIncomingMessage(data);

    const reactionPayload = MessageBuilder.createReaction({
      conversationId,
      from: account.userId,
      reaction: {
        legalHoldStatus,
        originalMessageId,
        type,
      },
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
      await account.service?.conversation.sendTypingStart(conversationId);
    } else {
      await account.service?.conversation.sendTypingStop(conversationId);
    }
  });

  account.on(PayloadBundleType.MESSAGE_DELETE, async data => {
    const {
      content: {messageId: originalMessageId},
      conversation: conversationId,
    } = data;

    await handleIncomingMessage(data);

    if (messageIdCache[originalMessageId]) {
      await account.service?.conversation.deleteMessageEveryone(conversationId, messageIdCache[originalMessageId]);

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
      editedPayload = MessageBuilder.createEditedText({
        conversationId,
        from: account.userId,
        newMessageText: text,
        originalMessageId: cachedOriginalMessageId,
        messageId: cachedMessageId,
      })
        .withLinkPreviews(newLinkPreviews)
        .withMentions(mentions)
        .withQuote(quote)
        .withReadConfirmation(expectsReadConfirmation)
        .withLegalHoldStatus(legalHoldStatus)
        .build();
    } else {
      await handleIncomingMessage(data);
      editedPayload = MessageBuilder.createEditedText({
        conversationId,
        from: account.userId,
        newMessageText: text,
        originalMessageId: cachedOriginalMessageId,
      })
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
    if (data.content.connection.status === ConnectionStatus.PENDING) {
      await account.service.connection.acceptConnection(data.content.connection.to);
    }
  });

  account.on(PayloadBundleType.CLIENT_ADD, async data => {
    logger.log(`User added client with ID "${data.content.client.id}"`, data);
  });

  account.on(PayloadBundleType.CLIENT_REMOVE, async data => {
    logger.log(`User removed client with ID "${data.content.client.id}"`, data);
  });
  logger.log('Logging in ...');
  await account.login(login);
  await account.listen();

  account.on(Account.TOPIC.ERROR, error => logger.error(error));

  const name = await account.service?.self.getName();

  logger.log('Name', name);
  logger.log('User ID', account['apiClient'].context?.userId);
  logger.log('Client ID', account['apiClient'].context?.clientId);
  logger.log('Domain', account['apiClient'].context?.domain);
  logger.log('Listening for messages ...');
})().catch(error => logger.error(error));
