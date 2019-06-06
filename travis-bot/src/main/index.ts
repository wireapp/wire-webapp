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

import {APIClient} from '@wireapp/api-client';
import {LoginData} from '@wireapp/api-client/dist/commonjs/auth/';
import {Account} from '@wireapp/core';
import {MemoryEngine} from '@wireapp/store-engine';
import {exec} from 'child_process';
import {promisify} from 'util';

import * as Changelog from 'generate-changelog';
import logdown from 'logdown';

const logger = logdown('@wireapp/travis-bot/TravisBot', {
  logger: console,
  markdown: false,
});

export interface MessageData {
  build: {
    number: string | number;
    repositoryName: string;
    url: string;
  };
  changelog?: string;
  commit: {
    author: string;
    branch: string;
    hash: string;
    message: string;
  };
  conversationIds?: string[];
}

export class TravisBot {
  constructor(private readonly loginData: LoginData, private readonly messageData: MessageData) {}

  get message(): string {
    const {
      build: {number: buildNumber, repositoryName},
    } = this.messageData;
    const {
      changelog,
      commit: {branch, author, hash, message},
    } = this.messageData;

    let msg = `**${repositoryName}: Build '${buildNumber}' finished on '${branch}' branch.**\n`;

    if (changelog) {
      msg += `\n**Changelog:** \n\n${changelog}`;
    } else {
      msg += `- Last commit from: ${author}\n- Last commit message: ${message}\n- https://github.com/${repositoryName}/commit/${hash}`;
    }

    return msg;
  }

  async start(): Promise<void> {
    let {conversationIds} = this.messageData;

    const engine = new MemoryEngine();
    await engine.init('');

    const client = new APIClient({store: engine, urls: APIClient.BACKEND.PRODUCTION});

    const account = new Account(client);
    await account.login(this.loginData);
    await account.listen();

    account.on('error', error => console.error(error));

    if (!conversationIds) {
      const allConversations = await client.conversation.api.getAllConversations();
      const groupConversations = allConversations.filter(conversation => conversation.type === 0);
      conversationIds = groupConversations.map(conversation => conversation.id);
    }

    await Promise.all(
      conversationIds.map(async id => {
        if (!account.service) {
          throw new Error('Account service is not set. Account not listening?');
        }
        if (id) {
          logger.log(`Sending message to conversation ${id} ...`);
          const textPayload = await account.service.conversation.messageBuilder.createText(id, this.message).build();
          await account.service.conversation.send(textPayload);
        }
      })
    );
  }

  static async generateChangelog(repoSlug: string, gitTag: string, maximumChars?: number): Promise<string> {
    const headlines = new RegExp('^#+ (.*)$', 'gm');
    const listItems = new RegExp('^\\* (.*) \\(\\[.*$', 'gm');
    const githubIssueLinks = new RegExp('\\[[^\\]]+\\]\\((https:[^)]+)\\)', 'gm');
    const omittedMessage = '... (content omitted)';

    const changelog = await Changelog.generate({
      repoUrl: `https://github.com/${repoSlug}`,
      tag: gitTag,
    });

    let styledChangelog = changelog
      .replace(headlines, '**$1**')
      .replace(listItems, '– $1')
      .replace(githubIssueLinks, '$1');

    if (maximumChars && styledChangelog.length > maximumChars) {
      styledChangelog = styledChangelog.substr(0, maximumChars - omittedMessage.length);

      const indexOfLastDash = styledChangelog.lastIndexOf('–');

      if (indexOfLastDash != -1) {
        styledChangelog = styledChangelog.substr(0, indexOfLastDash);
      }

      styledChangelog += `\n${omittedMessage}`;
    }

    return styledChangelog;
  }

  static async runCommand(command: string): Promise<string> {
    const {stderr, stdout} = await promisify(exec)(command);

    if (stderr) {
      throw new Error(`Command execution error: ${stderr}`);
    }

    return stdout.trim();
  }
}
