//@ts-check

process.on('uncaughtException', error =>
  console.error(`Uncaught exception "${error.constructor.name}" (${error.code}): ${error.message}`, error)
);
process.on('unhandledRejection', error =>
  console.error(`Uncaught rejection "${error.constructor.name}" (${error.code}): ${error.message}`, error)
);

const path = require('path');
require('dotenv').config({path: path.join(__dirname, 'echo1.env')});

const {Account} = require('@wireapp/core');
const APIClient = require('@wireapp/api-client');
const ClientType = require('@wireapp/api-client/dist/commonjs/client/ClientType');
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

  const engine = new MemoryEngine();
  await engine.init('receiver');

  const apiClient = new APIClient(new Config(engine, APIClient.BACKEND.PRODUCTION));
  const account = new Account(apiClient);

  account.on(Account.INCOMING.TEXT_MESSAGE, async data => {
    const {conversation: conversationId, from, content, id: messageId} = data;
    console.log(`Message "${messageId}" in "${conversationId}" from "${from}":`, content);
    await account.service.conversation.sendConfirmation(conversationId, messageId);
  });

  account.on(Account.INCOMING.CONFIRMATION, data => {
    const {conversation: conversationId, from, id: messageId} = data;
    console.log(`Confirmation "${messageId}" in "${conversationId}" from "${from}".`);
  });

  account.on(Account.INCOMING.ASSET, async data => {
    const {
      conversation,
      from,
      content: {uploaded, original},
    } = data;
    console.log(`Asset in "${conversation}" from "${from}":`, original);
    const fileType = original.mimeType.replace(/[^\/]+\//g, '');
    const image = await account.service.conversation.getImage(uploaded);
    await promisify(fs.writeFile)(path.join('.', `received_image.${fileType}`), image);
  });

  account.on(Account.INCOMING.PING, async data => {
    const {conversation: conversationId, from} = data;
    console.log(`Ping in "${conversationId}" from "${from}".`);
    await account.service.conversation.sendPing(conversationId);
  });

  account.on(Account.INCOMING.TYPING, async data => {
    const {
      conversation: conversationId,
      from,
      data: {status},
    } = data;
    console.log(`Typing in "${conversationId}" from "${from}".`, data);
    if (status === 'started') {
      await account.service.conversation.sendTypingStart(conversationId);
    } else {
      await account.service.conversation.sendTypingStop(conversationId);
    }
  });

  try {
    console.log('Logging in ...');
    await account.login(login);
    await account.listen();

    const name = await account.service.self.getName();

    console.log('My name:', name);
    console.log('Listening for messages ...');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
