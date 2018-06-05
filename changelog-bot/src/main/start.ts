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
import {ChangelogBot, MessageData} from './index';

export async function start(parameters: {[index: string]: string}): Promise<ChangelogBot> {
  const {WIRE_CHANGELOG_BOT_CONVERSATION_IDS, WIRE_CHANGELOG_BOT_EMAIL, WIRE_CHANGELOG_BOT_PASSWORD} = parameters;
  const {TRAVIS_COMMIT_RANGE, TRAVIS_REPO_SLUG} = process.env;

  const loginData: LoginData = {
    email: WIRE_CHANGELOG_BOT_EMAIL,
    password: WIRE_CHANGELOG_BOT_PASSWORD,
    persist: false,
  };

  const changelog = await ChangelogBot.generateChangelog(String(TRAVIS_REPO_SLUG), String(TRAVIS_COMMIT_RANGE));

  const messageData: MessageData = {
    content: changelog,
  };

  if (WIRE_CHANGELOG_BOT_CONVERSATION_IDS) {
    messageData.conversationIds = WIRE_CHANGELOG_BOT_CONVERSATION_IDS.replace(' ', '').split(',');
  }

  const bot = new ChangelogBot(loginData, messageData);
  await bot.start();

  return bot;
}
