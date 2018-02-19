process.on('uncaughtException', error =>
  console.error(`Uncaught exception "${error.constructor.name}" (${error.code}): ${error.message}`, error)
);
process.on('unhandledRejection', error =>
  console.error(`Uncaught rejection "${error.constructor.name}" (${error.code}): ${error.message}`, error)
);

const path = require('path');
require('dotenv').config({path: path.join(__dirname, 'echo1.env')});

const {Account} = require('@wireapp/core');

const account = new Account();

account.on(Account.INCOMING.TEXT_MESSAGE, data => {
  console.log(`Message in "${data.conversation}" from "${data.from}": "${data.content}"`);
});

const login = {
  email: process.env.WIRE_EMAIL,
  password: process.env.WIRE_PASSWORD,
  persist: false,
};

account.listen(login).catch(error => {
  console.error(error);
  process.exit(1);
});
