process.on('uncaughtException', error =>
  console.error(`Uncaught exception "${error.constructor.name}" (${error.code}): ${error.message}`, error)
);
process.on('unhandledRejection', error =>
  console.error(`Uncaught rejection "${error.constructor.name}" (${error.code}): ${error.message}`, error)
);

const path = require('path');
require('dotenv').config({path: path.join(__dirname, 'echo2.env')});

const {Account} = require('@wireapp/core');

const account = new Account();

const CONVERSATION_ID = process.env.WIRE_CONVERSATION_ID;

const login = {
  email: process.env.WIRE_EMAIL,
  password: process.env.WIRE_PASSWORD,
  persist: false,
};

account
  .listen(login)
  .then(() => {
    async function sendMessage() {
      const timeoutInMillis = 2000;
      setTimeout(async () => {
        account.service.conversation.sendTextMessage(CONVERSATION_ID, 'Hello World!').then(() => sendMessage());
      }, timeoutInMillis);
    }

    sendMessage();
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
