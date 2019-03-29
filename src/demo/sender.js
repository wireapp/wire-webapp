/* eslint-disable no-magic-numbers, no-unused-vars */
//@ts-check

process.on('uncaughtException', error =>
  console.error(`Uncaught exception "${error.constructor.name}": ${error.message}`, error)
);
process.on('unhandledRejection', (reason, promise) =>
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
);

const crypto = require('crypto');
const program = require('commander');
const logdown = require('logdown');
const fs = require('fs');
const path = require('path');
const TimeUnits = require('./TimeUnits');
const {promisify} = require('util');

program.option('-c, --conversationId <conversationId>').parse(process.argv);

require('dotenv').config({path: path.join(__dirname, 'sender.env')});

const logger = logdown('@wireapp/core/demo/sender.js', {
  logger: console,
  markdown: false,
});
logger.state.isEnabled = true;

const {Account} = require('@wireapp/core');
const {APIClient} = require('@wireapp/api-client');
const {ClientType} = require('@wireapp/api-client/dist/commonjs/client/');
const {FileEngine} = require('@wireapp/store-engine');

(async () => {
  const CONVERSATION_ID = program.conversationId || process.env.WIRE_CONVERSATION_ID;
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

  account.on('error', error => logger.error(error));

  const name = await account.service.self.getName();

  logger.log('Name', name);
  logger.log('User ID', account.apiClient.context.userId);
  logger.log('Client ID', account.apiClient.context.clientId);

  async function sendAndDeleteMessage() {
    const deleteTextPayload = account.service.conversation.createText('Delete me!').build();
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
    const payload = account.service.conversation.createText(`Expires after ${expiry}ms ...`).build();
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
    const payload = account.service.conversation.createText('Hello, World!').build();
    await account.service.conversation.send(CONVERSATION_ID, payload);
  }

  async function sendAndEdit() {
    const payload = account.service.conversation.createText('Hello, Wolrd!').build();
    const {id: originalMessageId} = await account.service.conversation.send(CONVERSATION_ID, payload);
    setInterval(async () => {
      const editedPayload = account.service.conversation.createEditedText('Hello, World!', originalMessageId).build();
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

  async function sendMentions() {
    const conversation = await account.service.conversation.getConversations(CONVERSATION_ID);
    const userIds = conversation.members.others.map(participant => participant.id);
    const users = await account.service.user.getUsers(userIds);

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

    const payload = account.service.conversation
      .createText(text)
      .withMentions(mentions)
      .build();

    await account.service.conversation.send(CONVERSATION_ID, payload);
  }

  async function sendQuote() {
    const text = 'Hello';

    const textPayload = account.service.conversation.createText(text).build();

    const {id: messageId} = await account.service.conversation.send(CONVERSATION_ID, textPayload);

    const quoteText = 'Hello again';

    const quote = {
      content: textPayload.content,
      quotedMessageId: messageId,
    };

    const quotePayload = account.service.conversation
      .createText(quoteText)
      .withQuote(quote, textPayload.timestamp)
      .build();

    await account.service.conversation.send(CONVERSATION_ID, quotePayload);
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

  const timeoutInMillis = 2000;
  setInterval(() => {
    const randomMethod = methods[Math.floor(Math.random() * methods.length)];
    randomMethod();
  }, timeoutInMillis);
})();
