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

import {Account} from '@wireapp/core';
import {Config} from '@wireapp/api-client/dist/commonjs/Config';
import {exec} from 'child_process';
import {LoginData} from '@wireapp/api-client/dist/commonjs/auth/';
import {MemoryEngine} from '@wireapp/store-engine';
import {promisify} from 'util';

import APIClient = require('@wireapp/api-client');
import * as Changelog from 'generate-changelog';

const logdown = require('logdown');

const logger = logdown('@wireapp/travis-bot/TravisBot', {
  logger: console,
  markdown: false,
});

export interface MessageData {
  commit: {
    author: string;
    branch: string;
    hash: string;
    message: string;
  };
  build: {
    number: string | number;
    repositoryName: string;
    url: string;
  };
  conversationIds?: Array<string>;
}

class TravisBot {
  constructor(private loginData: LoginData, private messageData: MessageData) {}

  get message(): string {
    const {build: {number: buildNumber, repositoryName}} = this.messageData;
    const {commit: {branch, author, hash, message}} = this.messageData;

    return (
      `**${repositoryName}: Travis build '${buildNumber}' finished on '${branch}' branch.** ᕦ(￣ ³￣)ᕤ\n` +
      `- Last commit from: ${author}\n` +
      `- Last commit message: ${message}\n` +
      `- https://github.com/${repositoryName}/commit/${hash}`
    );
  }

  async start(): Promise<void> {
    let {conversationIds} = this.messageData;

    const engine = new MemoryEngine();
    await engine.init('');

    const client = new APIClient(new Config(engine, APIClient.BACKEND.PRODUCTION));

    const account = new Account(client);
    await account.listen(this.loginData);

    if (!conversationIds) {
      const MAXIMUM_CONVERSATIONS = 500;

      const allConversations = await client.conversation.api.getConversations(MAXIMUM_CONVERSATIONS);
      const groupConversations = allConversations.conversations.filter(conversation => conversation.type === 0);
      conversationIds = groupConversations.map(conversation => conversation.id);
    }

    await Promise.all(
      conversationIds.map(async id => {
        if (!account.service) {
          throw new Error(`Account service is not set: ${account}`);
        }
        if (id) {
          logger.info(`Sending message to conversation ${id} ...`);
          await account.service.conversation.sendTextMessage(id, this.message);
        }
      })
    );
  }

  static async generateChangelog(repoSlug: string, gitTag: string, maximumChars?: number): Promise<string> {
    const headlines = new RegExp('^#+ (.*)$', 'gm');
    const listItems = new RegExp('^\\* (.*) \\(\\[.*$', 'gm');

    const changelog = await Changelog.generate({
      repoUrl: `https://github.com/${repoSlug}`,
      tag: gitTag,
    });

    const styledChangelog = changelog.replace(headlines, '**$1**').replace(listItems, '– $1');

    return changelog.substring(0, maximumChars);
  }

  static async runCommand(command: string): Promise<string> {
    const {stderr, stdout} = await promisify(exec)(command);

    if (stderr) {
      throw new Error(`Command execution error: ${stderr}`);
    }

    return stdout.trim();
  }
}

export {TravisBot};
