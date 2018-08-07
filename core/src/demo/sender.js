/* eslint-disable no-magic-numbers, no-unused-vars */
//@ts-check

process.on('uncaughtException', error =>
  console.error(`Uncaught exception "${error.constructor.name}": ${error.message}`, error)
);
process.on('unhandledRejection', error =>
  console.error(`Uncaught rejection "${error.constructor.name}": ${error.message}`, error)
);

const logdown = require('logdown');
const fs = require('fs');
const path = require('path');
const TimeUnits = require('./TimeUnits');
const {promisify} = require('util');
require('dotenv').config({path: path.join(__dirname, 'sender.env')});

const logger = logdown('@wireapp/core/demo/sender.js', {
  logger: console,
  markdown: false,
});
logger.state.isEnabled = true;

const {Account} = require('@wireapp/core');
const {APIClient} = require('@wireapp/api-client');
const {ClientType} = require('@wireapp/api-client/dist/commonjs/client/');
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

  const backend = process.env.WIRE_BACKEND === 'staging' ? APIClient.BACKEND.STAGING : APIClient.BACKEND.PRODUCTION;
  const engine = new FileEngine(path.join(__dirname, '.tmp', 'sender'));
  await engine.init(undefined, {fileExtension: '.json'});
  const apiClient = new APIClient({store: engine, urls: backend});
  const account = new Account(apiClient);
  await account.login(login);
  await account.listen();

  const name = await account.service.self.getName();

  logger.log('Name', name);
  logger.log('User ID', account.apiClient.context.userId);
  logger.log('Client ID', account.apiClient.context.clientId);

  async function sendAndDeleteMessage() {
    const deleteTextPayload = account.service.conversation.createText('Delete me!');
    const {id: messageId} = await account.service.conversation.send(CONVERSATION_ID, deleteTextPayload);

    const fiveSecondsInMillis = 5000;
    setTimeout(async () => {
      await account.service.conversation.deleteMessageEveryone(CONVERSATION_ID, messageId);
    }, fiveSecondsInMillis);
  }

  async function sendConversationLevelTimer(timeInMillis = TimeUnits.ONE_YEAR_IN_MILLIS) {
    await account.apiClient.conversation.api.putConversationMessageTimer(CONVERSATION_ID, {
      message_timer: timeInMillis,
    });
  }

  async function sendEphemeralText(expiry = MESSAGE_TIMER) {
    account.service.conversation.messageTimer.setMessageLevelTimer(CONVERSATION_ID, expiry);
    const payload = account.service.conversation.createText(`Expires after ${expiry}ms ...`);
    await account.service.conversation.send(CONVERSATION_ID, payload);
    account.service.conversation.messageTimer.setMessageLevelTimer(CONVERSATION_ID, 0);
  }

  async function sendPing(expiry = MESSAGE_TIMER) {
    account.service.conversation.messageTimer.setMessageLevelTimer(CONVERSATION_ID, expiry);
    const payload = account.service.conversation.createPing();
    await account.service.conversation.send(CONVERSATION_ID, payload);
    account.service.conversation.messageTimer.setMessageLevelTimer(CONVERSATION_ID, 0);
  }

  async function sendText() {
    const payload = account.service.conversation.createText('Hello, World!');
    await account.service.conversation.send(CONVERSATION_ID, payload);
  }

  async function sendAndEdit() {
    const payload = account.service.conversation.createText('Hello, Wolrd!');
    const {id: originalMessageId} = await account.service.conversation.send(CONVERSATION_ID, payload);
    setInterval(async () => {
      const editedPayload = account.service.conversation.createEditedText('Hello, World!', originalMessageId);
      await account.service.conversation.send(CONVERSATION_ID, editedPayload);
    }, 2000);
  }

  async function sendImage() {
    const data = await promisify(fs.readFile)(path.join(__dirname, 'wire_logo.png'));
    const image = {
      data,
      height: 244,
      type: 'image/png',
      width: 500,
    };
    const imagePayload = await account.service.conversation.createImage(image);
    await account.service.conversation.send(CONVERSATION_ID, imagePayload);
  }

  async function sendFile() {
    const filename = 'wire_logo.png';
    const data = await promisify(fs.readFile)(path.join(__dirname, filename));
    const metadataPayload = await account.service.conversation.createFileMetadata({
      length: data.length,
      name: filename,
      type: 'image/png',
    });
    await account.service.conversation.send(CONVERSATION_ID, metadataPayload);

    const filePayload = await account.service.conversation.createFileData({data}, metadataPayload.id);
    await account.service.conversation.send(CONVERSATION_ID, filePayload);
  }

  async function clearConversation() {
    await account.service.conversation.clearConversation(CONVERSATION_ID);
  }

  const methods = [sendAndDeleteMessage, sendAndEdit, sendEphemeralText, sendFile, sendImage, sendPing, sendText];

  const timeoutInMillis = 2000;
  setInterval(() => {
    const randomMethod = methods[Math.floor(Math.random() * methods.length)];
    randomMethod();
  }, timeoutInMillis);
})();
