//@ts-check

process.on('uncaughtException', error =>
  console.error(`Uncaught exception "${error.constructor.name}" (code: ${error.code}): ${error.message}`, error)
);
process.on('unhandledRejection', error =>
  console.error(`Uncaught rejection "${error.constructor.name}" (code: ${error.code}): ${error.message}`, error)
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
  const MESSAGE_TIMER = 5000;

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

  async function sendEphemeralText(expiry = MESSAGE_TIMER) {
    const payload = await account.service.conversation.createText(`Expires after ${expiry}ms ...`);
    await account.service.conversation.send(CONVERSATION_ID, payload, expiry);
  }

  async function sendPing(expiry = MESSAGE_TIMER) {
    const payload = await account.service.conversation.createPing();
    await account.service.conversation.send(CONVERSATION_ID, payload, expiry);
  }

  async function sendText() {
    const payload = await account.service.conversation.createText('Hello, World!');
    await account.service.conversation.send(CONVERSATION_ID, payload);
  }

  const methods = [sendEphemeralText, sendPing, sendText];

  const timeoutInMillis = 2000;
  setInterval(() => {
    const randomMethod = methods[Math.floor(Math.random() * methods.length)];
    randomMethod();
  }, timeoutInMillis);
})();
