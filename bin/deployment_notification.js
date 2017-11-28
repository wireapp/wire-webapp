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

const {Account} = require('@wireapp/core');

const login = {
  email: process.env.WIRE_WEBAPP_BOT_EMAIL,
  password: process.env.WIRE_WEBAPP_BOT_PASSWORD,
};

const commit = {
  author: process.argv[2],
  branch: process.env.TRAVIS_BRANCH,
  message: process.argv[3],
};

const build = {
  number: process.env.TRAVIS_BUILD_NUMBER,
  url: '',
};

const content = {
  conversationId: '9fe8b359-b9e0-4624-b63c-71747664e4fa',
  message: 'Hello World',
};

switch (commit.branch) {
  case 'dev':
    build.url = 'https://wire-webapp-dev.zinfra.io/login/?env=prod#login';
    break;
  case 'edge':
    build.url = 'https://wire-webapp-edge.zinfra.io/login/?env=staging#login';
    break;
  case 'prod':
    build.url = 'https://wire-webapp-prod-next.wire.com/login/#login';
    break;
  case 'staging':
    build.url = 'https://wire-webapp-staging.zinfra.io/login/?env=prod#login';
    break;
  default:
    build.url = 'https://app.wire.com/';
}

content.message =
  `**Travis build '${build.number}' deployed on '${commit.branch}' environment.** ᕦ(￣ ³￣)ᕤ` +
  `\r\n- Link: ${build.url}` +
  `\r\n- Last commit from: ${commit.author}` +
  `\r\n- Last commit message: ${commit.message}`;

const bot = new Account({
  email: login.email,
  password: login.password,
});

bot
  .listen()
  .then(() => bot.sendTextMessage(content.conversationId, content.message))
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error.message);
    return process.exit(1);
  });
