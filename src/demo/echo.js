//@ts-check

process.on('uncaughtException', (/** @type {any} */ error) =>
  logger.error(`Uncaught exception "${error.constructor.name}" (${error.code}): ${error.message}`, error)
);
process.on('unhandledRejection', (/** @type {any} */ error) =>
  logger.error(`Uncaught rejection "${error.constructor.name}" (${error.code}): ${error.message}`, error)
);

const path = require('path');
const logdown = require('logdown');
require('dotenv').config({path: path.join(__dirname, 'echo.env')});

const logger = logdown('@wireapp/core/demo/echo.js', {
  logger: console,
  markdown: false,
});
logger.state.isEnabled = true;

const {Account} = require('@wireapp/core');
const {PayloadBundleType} = require('@wireapp/core/dist/conversation/root');
const {APIClient} = require('@wireapp/api-client');
const {Config} = require('@wireapp/api-client/dist/commonjs/Config');
const {ClientType} = require('@wireapp/api-client/dist/commonjs/client/ClientType');
const {CONVERSATION_TYPING} = require('@wireapp/api-client/dist/commonjs/event/');
const {MemoryEngine} = require('@wireapp/store-engine/dist/commonjs/engine/');

const assetOriginalCache = {};

(async () => {
  const login = {
    clientType: ClientType.TEMPORARY,
    email: process.env.WIRE_EMAIL,
    password: process.env.WIRE_PASSWORD,
  };

  const backend = process.env.WIRE_BACKEND === 'staging' ? APIClient.BACKEND.STAGING : APIClient.BACKEND.PRODUCTION;
  const engine = new MemoryEngine();
  await engine.init('receiver');

  const apiClient = new APIClient(new Config(engine, backend));
  const account = new Account(apiClient);

  account.on(PayloadBundleType.TEXT, async data => {
    const {conversation: conversationId, from, content, id: messageId, messageTimer} = data;
    logger.log(
      `Message "${messageId}" in "${conversationId}" from "${from}":`,
      content.text,
      messageTimer ? `(ephemeral message, ${messageTimer} ms timeout)` : ''
    );

    const confirmationPayload = account.service.conversation.createConfirmation(messageId);
    await account.service.conversation.send(conversationId, confirmationPayload);

    const textPayload = account.service.conversation.createText(content.text);
    account.service.conversation.messageTimer.setConversationLevelTimer(conversationId, messageTimer);
    await account.service.conversation.send(conversationId, textPayload);
    account.service.conversation.messageTimer.setMessageLevelTimer(conversationId, 0);
  });

  account.on(PayloadBundleType.CONFIRMATION, data => {
    const {conversation: conversationId, from, id: messageId} = data;
    logger.log(`Confirmation "${messageId}" in "${conversationId}" from "${from}".`);
  });

  account.on(PayloadBundleType.ASSET, async data => {
    const {conversation: conversationId, from, content, id: messageId, messageTimer} = data;
    logger.log(
      `Asset "${messageId}" in "${conversationId}" from "${from}":`,
      data.content,
      messageTimer ? `(ephemeral message, ${messageTimer} ms timeout)` : ''
    );

    const cacheOriginal = assetOriginalCache[messageId];
    if (!cacheOriginal) {
      throw new Error(`Uploaded data for message ID "${messageId} was received before the metadata."`);
    }

    const fileBuffer = await account.service.conversation.getAsset(content.uploaded);

    const fileMetaDataPayload = await account.service.conversation.createFileMetadata({
      length: fileBuffer.length,
      name: cacheOriginal.name,
      type: cacheOriginal.mimeType,
    });
    await account.service.conversation.send(conversationId, fileMetaDataPayload);

    try {
      const filePayload = await account.service.conversation.createFileData({data: fileBuffer}, fileMetaDataPayload.id);
      await account.service.conversation.send(conversationId, filePayload);

      delete assetOriginalCache[data.messageId];
    } catch (error) {
      console.error(`Error while sending asset: "${error.stack}"`);
      const fileAbortPayload = await account.service.conversation.createFileAbort(0, fileMetaDataPayload.id);
      await account.service.conversation.send(conversationId, fileAbortPayload);
    }
  });

  account.on(PayloadBundleType.ASSET_META, data => {
    const {conversation: conversationId, from, content, id: messageId, messageTimer} = data;
    logger.log(
      `Asset metadata "${messageId}" in "${conversationId}" from "${from}":`,
      data.content,
      messageTimer ? `(ephemeral message, ${messageTimer} ms timeout)` : ''
    );

    assetOriginalCache[messageId] = content.original;
  });

  account.on(PayloadBundleType.ASSET_ABORT, async data => {
    const {conversation: conversationId, from, content, id: messageId, messageTimer} = data;
    logger.log(
      `Asset "${messageId}" not uploaded (reason: "${content.abortReason}") in "${conversationId}" from "${from}":`,
      data,
      messageTimer ? `(ephemeral message, ${messageTimer} ms timeout)` : ''
    );

    const cacheOriginal = assetOriginalCache[messageId];
    if (!cacheOriginal) {
      throw new Error(`Abort message for message ID "${messageId} was received before the metadata."`);
    }

    const fileMetaDataPayload = await account.service.conversation.createFileMetadata({
      length: 0,
      name: cacheOriginal.name,
      type: cacheOriginal.mimeType,
    });
    await account.service.conversation.send(conversationId, fileMetaDataPayload);

    const fileAbortPayload = await account.service.conversation.createFileAbort(0, fileMetaDataPayload.id);
    await account.service.conversation.send(conversationId, fileAbortPayload);

    delete assetOriginalCache[data.messageId];
  });

  account.on(PayloadBundleType.ASSET_IMAGE, async data => {
    const {
      conversation: conversationId,
      from,
      content: {uploaded, original},
      id: messageId,
      messageTimer,
    } = data;
    logger.log(
      `Image "${messageId}" in "${conversationId}" from "${from}":`,
      data,
      messageTimer ? `(ephemeral message, ${messageTimer} ms timeout)` : ''
    );

    const imageBuffer = await account.service.conversation.getAsset(uploaded);
    const imagePayload = await account.service.conversation.createImage({
      data: imageBuffer,
      height: original.image.height,
      type: original.mimeType,
      width: original.image.width,
    });
    await account.service.conversation.send(conversationId, imagePayload);
  });

  account.on(PayloadBundleType.PING, async data => {
    const {conversation: conversationId, from, messageTimer} = data;
    logger.log(
      `Ping in "${conversationId}" from "${from}".`,
      messageTimer ? `(ephemeral message, ${messageTimer} ms timeout)` : ''
    );
    const payload = account.service.conversation.createPing();
    account.service.conversation.messageTimer.setMessageLevelTimer(conversationId, messageTimer);
    await account.service.conversation.send(conversationId, payload);
    account.service.conversation.messageTimer.setMessageLevelTimer(conversationId, 0);
  });

  account.on(PayloadBundleType.REACTION, async data => {
    const {conversation: conversationId, from, content} = data;
    logger.log(`Reaction in "${conversationId}" from "${from}": "${content.emoji}".`);

    const reactionPayload = account.service.conversation.createReaction(content.originalMessageId, content.emoji);
    await account.service.conversation.send(conversationId, reactionPayload);
  });

  account.on(Account.INCOMING.TYPING, async data => {
    const {
      conversation: conversationId,
      from,
      data: {status},
    } = data;

    logger.log(`Typing in "${conversationId}" from "${from}".`, data);

    if (status === CONVERSATION_TYPING.STARTED) {
      await account.service.conversation.sendTypingStart(conversationId);
    } else {
      await account.service.conversation.sendTypingStop(conversationId);
    }
  });

  account.on(PayloadBundleType.MESSAGE_DELETE, async data => {
    const {conversation: conversationId, id: messageId, from} = data;
    logger.log(`Deleted message "${messageId}" in "${conversationId}" by "${from}".`, data);
  });

  account.on(PayloadBundleType.MESSAGE_HIDE, async data => {
    const {conversation: conversationId, id: messageId, from} = data;
    logger.log(`Hidden message "${messageId}" in "${conversationId}" by "${from}".`, data);
  });

  account.on(PayloadBundleType.CONNECTION_REQUEST, async data => {
    const {
      connection: {conversation: conversationId, to: connectingUserId},
      user: {name: connectingUser},
    } = data;
    logger.log(`Connection request from "${connectingUser}" in "${conversationId}".`);
    await account.service.connection.acceptConnection(connectingUserId);
  });

  try {
    logger.log('Logging in ...');
    await account.login(login);
    await account.listen();

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
