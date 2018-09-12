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
import * as Changelog from 'generate-changelog';
import {promisify} from 'util';
import {ChangelogData} from './ChangelogData';

const logdown = require('logdown');

const logger = logdown('@wireapp/changelog-bot/ChangelogBot', {
  logger: console,
  markdown: false,
});

class ChangelogBot {
  constructor(private readonly loginData: LoginData, private readonly messageData: ChangelogData) {}

  get message(): string {
    const {content, repoSlug} = this.messageData;
    return `\n**Changelog for "${repoSlug}":**\n\n${content}\n`;
  }

  async sendMessage(customMessage?: string): Promise<void> {
    let {conversationIds} = this.messageData;

    const engine = new MemoryEngine();
    await engine.init('');

    const client = new APIClient({store: engine, urls: APIClient.BACKEND.PRODUCTION});

    const account = new Account(client);
    await account.login(this.loginData);

    if (!conversationIds) {
      const allConversations = await client.conversation.api.getAllConversations();
      const groupConversations = allConversations.filter(conversation => conversation.type === 0);
      conversationIds = groupConversations.map(conversation => conversation.id);
    }

    await Promise.all(
      conversationIds.map(async id => {
        if (!account.service) {
          throw new Error(`Account service is not set. Not logged in?`);
        }
        if (id) {
          logger.log(`Sending message to conversation ${id} ...`);
          const textPayload = await account.service.conversation.createText(customMessage || this.message).build();
          await account.service.conversation.send(id, textPayload);
        }
      })
    );
  }

  static async generateChangelog(repoSlug: string, previousGitTag: string, maximumChars?: number): Promise<string> {
    const headlines = new RegExp('^#+ (.*)$', 'gm');
    const listItems = new RegExp('^\\* (.*) \\(\\[.*$', 'gm');
    const githubIssueLinks = new RegExp('\\[[^\\]]+\\]\\((https:[^)]+)\\)', 'gm');
    const omittedMessage = '... (content omitted)';

    const changelog = await Changelog.generate({
      exclude: ['build', 'chore', 'docs', 'refactor', 'test'],
      repoUrl: `https://github.com/${repoSlug}`,
      tag: previousGitTag,
    });

    let styledChangelog = changelog
      .replace(headlines, '**$1**')
      .replace(listItems, '– $1')
      .replace(githubIssueLinks, '$1/files?diff=unified');

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

export {ChangelogBot};
