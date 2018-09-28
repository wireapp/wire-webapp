/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {ClientType} from '@wireapp/api-client/dist/commonjs/client/';

import {ChangelogBot} from './ChangelogBot';
import {ChangelogData, LoginDataBackend, Parameters} from './interfaces';

export async function start(parameters: Parameters): Promise<void> {
  const {backend, conversationIds, email, password, travisCommitRange, travisRepoSlug} = parameters;
  let message = parameters.message;
  const isCustomMessage = !!message;

  const loginData: LoginDataBackend = {
    backend,
    clientType: ClientType.TEMPORARY,
    email,
    password,
  };

  if (!loginData.email) {
    throw new Error('You need to specify an email address. Otherwise this bot will not work.');
  }

  if (!loginData.password) {
    throw new Error('You need to specify a password. Otherwise this bot will not work.');
  }

  if (!travisRepoSlug) {
    throw new Error('You need to specify a repository slug. Otherwise this bot will not work.');
  }

  if (!travisCommitRange) {
    throw new Error('You need to specify a commit range. Otherwise this bot will not work.');
  }

  if (!message) {
    message = await ChangelogBot.generateChangelog(travisRepoSlug, travisCommitRange);
  }

  const messageData: ChangelogData = {
    content: message,
    isCustomMessage,
    repoSlug: travisRepoSlug,
  };

  if (conversationIds) {
    messageData.conversationIds = conversationIds.replace(/\s/g, '').split(',');
  }

  const bot = new ChangelogBot(loginData, messageData);
  await bot.sendMessage();
}
