//@ts-check

process.on('uncaughtException', error =>
  console.error(`Uncaught exception "${error.constructor.name}" (${error.code}): ${error.message}`, error)
);
process.on('unhandledRejection', error =>
  console.error(`Uncaught rejection "${error.constructor.name}" (${error.code}): ${error.message}`, error)
);

const path = require('path');
require('dotenv').config({path: path.join(__dirname, 'echo2.env')});

const {Account} = require('@wireapp/core');
const APIClient = require('@wireapp/api-client');
const {ClientType} = require('@wireapp/api-client/dist/commonjs/client/ClientType');
const {Config} = require('@wireapp/api-client/dist/commonjs/Config');
const {FileEngine} = require('@wireapp/store-engine');

(async () => {
  const CONVERSATION_ID = process.env.WIRE_CONVERSATION_ID;

  const login = {
    clientType: ClientType.TEMPORARY,
    email: process.env.WIRE_EMAIL,
    password: process.env.WIRE_PASSWORD,
  };

  const engine = new FileEngine(path.join(__dirname, '.tmp', 'sender'));
  await engine.init(undefined, {fileExtension: '.json'});
  const apiClient = new APIClient(new Config(engine, APIClient.BACKEND.PRODUCTION));
  const account = new Account(apiClient);
  await account.login(login);
  await account.listen();
  const textMessage = await account.service.conversation.createText('Hello World');

  function sendMessage() {
    const timeoutInMillis = 2000;
    setTimeout(async () => {
      const textPayload = await account.service.conversation.createText(textMessage);
      await account.service.conversation.sendText(CONVERSATION_ID, textPayload);
      sendMessage();
    }, timeoutInMillis);
  }

  sendMessage();
})();
