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

import {LoginData} from '@wireapp/api-client/dist/commonjs/auth/';
import {ClientType} from '@wireapp/api-client/dist/commonjs/client/';
import {ChangelogBot} from './ChangelogBot';
import {ChangelogData} from './ChangelogData';

export async function start(parameters: {[index: string]: string}): Promise<ChangelogBot> {
  const {conversationIds, email, password} = parameters;
  const {TRAVIS_COMMIT_RANGE, TRAVIS_REPO_SLUG} = process.env;

  const loginData: LoginData = {
    clientType: ClientType.TEMPORARY,
    email,
    password,
  };

  if (!TRAVIS_REPO_SLUG) {
    throw Error('You need to specify a repository slug. Otherwise this script will not work.');
  }

  if (!TRAVIS_COMMIT_RANGE) {
    throw Error('You need to specify a commit range. Otherwise this script will not work.');
  }

  const changelog = await ChangelogBot.generateChangelog(TRAVIS_REPO_SLUG, TRAVIS_COMMIT_RANGE);

  const messageData: ChangelogData = {
    content: changelog,
    repoSlug: TRAVIS_REPO_SLUG,
  };

  if (conversationIds) {
    messageData.conversationIds = conversationIds.replace(' ', '').split(',');
  }

  const bot = new ChangelogBot(loginData, messageData);
  await bot.start();

  return bot;
}
