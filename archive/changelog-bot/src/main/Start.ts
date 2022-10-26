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

import {ClientType} from '@wireapp/api-client/lib/client/';
import logdown from 'logdown';

import {ChangelogBot} from './ChangelogBot';
import {ChangelogData, LoginDataBackend, Parameters} from './Interfaces';

const logger = logdown('@wireapp/changelog-bot/Start', {
  logger: console,
  markdown: false,
});

export async function start(parameters: Parameters): Promise<void> {
  const {backend, conversationIds, email, excludeCommitTypes, password, travisRepoSlug, travisTag} = parameters;
  let {travisCommitRange, message} = parameters;
  const isCustomMessage = !!message;
  const MAXIMUM_CHARS = 10000;

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
    if (travisTag) {
      logger.info('Info: Using the latest tag as commit base since no commit range was specified.');
      travisCommitRange = await ChangelogBot.runCommand(`git describe --abbrev=0 --tags "${travisTag}^"`);
    } else {
      throw new Error('You need to specify a commit range or a tag. Otherwise this bot will not work.');
    }
  }

  if (!message) {
    message = await ChangelogBot.generateChangelog(
      travisRepoSlug,
      travisCommitRange,
      MAXIMUM_CHARS,
      excludeCommitTypes,
    );
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
