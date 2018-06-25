//@ts-check

process.on('uncaughtException', error =>
  logger.error(`Uncaught exception "${error.constructor.name}" (${error.code}): ${error.message}`, error)
);
process.on('unhandledRejection', error =>
  logger.error(`Uncaught rejection "${error.constructor.name}" (${error.code}): ${error.message}`, error)
);

const path = require('path');
const logdown = require('logdown');
require('dotenv').config({path: path.join(__dirname, 'echo1.env')});

const logger = logdown('@wireapp/core/demo/echo.js', {
  logger: console,
  markdown: false,
});
logger.state.isEnabled = true;

const {Account} = require('@wireapp/core');
const APIClient = require('@wireapp/api-client');
const {ClientType} = require('@wireapp/api-client/dist/commonjs/client/ClientType');
const fs = require('fs');
const {promisify} = require('util');
const {Config} = require('@wireapp/api-client/dist/commonjs/Config');
const {MemoryEngine} = require('@wireapp/store-engine/dist/commonjs/engine');

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

  account.on(Account.INCOMING.TEXT_MESSAGE, async data => {
    const {conversation: conversationId, from, content, id: messageId, messageTimer} = data;
    logger.log(
      `Message "${messageId}" in "${conversationId}" from "${from}":`,
      content,
      messageTimer ? `(ephemeral message, ${messageTimer} ms timeout)` : ''
    );

    const confirmationPayload = account.service.conversation.createConfirmation(messageId);
    await account.service.conversation.send(conversationId, confirmationPayload);

    const textPayload = account.service.conversation.createText(content);
    account.service.conversation.messageTimer.setConversationLevelTimer(conversationId, messageTimer);
    await account.service.conversation.send(conversationId, textPayload);
    account.service.conversation.messageTimer.setMessageLevelTimer(conversationId, 0);
  });

  account.on(Account.INCOMING.CONFIRMATION, data => {
    const {conversation: conversationId, from, id: messageId} = data;
    logger.log(`Confirmation "${messageId}" in "${conversationId}" from "${from}".`);
  });

  account.on(Account.INCOMING.ASSET, async data => {
    const {
      conversation,
      from,
      content: {uploaded, original},
      messageTimer,
    } = data;
    logger.log(
      `Asset in "${conversation}" from "${from}":`,
      original,
      messageTimer ? `(ephemeral message, ${messageTimer} ms timeout)` : ''
    );
    const fileType = original.mimeType.replace(/[^\/]+\//g, '');
    const image = await account.service.conversation.getImage(uploaded);
    await promisify(fs.writeFile)(path.join('.', `received_image.${fileType}`), image);
  });

  account.on(Account.INCOMING.PING, async data => {
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

  account.on(Account.INCOMING.TYPING, async data => {
    const {
      conversation: conversationId,
      from,
      data: {status},
    } = data;

    logger.log(`Typing in "${conversationId}" from "${from}".`, data);

    if (status === 'started') {
      await account.service.conversation.sendTypingStart(conversationId);
    } else {
      await account.service.conversation.sendTypingStop(conversationId);
    }
  });

  try {
    logger.log('Logging in ...');
    await account.login(login);
    await account.listen();

    const name = await account.service.self.getName();

    logger.log('Name:', name);
    logger.log('User ID:', account.service.self.apiClient.context.userId);
    logger.log('Client ID:', account.service.self.apiClient.context.clientId);
    logger.log('Listening for messages ...');
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
})();
