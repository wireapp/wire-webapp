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

import {exec} from 'child_process';
import {promisify} from 'util';
import {APIClient} from '@wireapp/api-client';
import {Account} from '@wireapp/core';
import {MemoryEngine} from '@wireapp/store-engine';
import * as Changelog from 'generate-changelog';
import logdown from 'logdown';

import {ChangelogData, LoginDataBackend} from './Interfaces';
import {buildTextMessage} from '@wireapp/core/src/main/conversation/message/MessageBuilder';
import {ConversationProtocol} from '@wireapp/api-client/src/conversation';

const logger = logdown('@wireapp/changelog-bot/ChangelogBot', {
  logger: console,
  markdown: false,
});

logger.state.isEnabled = true;

export class ChangelogBot {
  public static SETUP = {
    EXCLUDED_COMMIT_TYPES: ['build', 'chore', 'docs', 'refactor', 'runfix', 'test'],
  };

  constructor(private readonly loginData: LoginDataBackend, private readonly messageData: ChangelogData) {}

  get message(): string {
    const {content, isCustomMessage, repoSlug} = this.messageData;
    return isCustomMessage ? content : `\n**Changelog for "${repoSlug}":**\n\n${content}\n`;
  }

  async sendMessage(): Promise<void> {
    let {conversationIds} = this.messageData;

    const engine = new MemoryEngine();
    await engine.init('changelog-bot');

    const backendUrls = this.loginData.backend === 'staging' ? APIClient.BACKEND.STAGING : APIClient.BACKEND.PRODUCTION;

    const client = new APIClient({urls: backendUrls});

    const account = new Account(client, {createStore: () => Promise.resolve(engine)});
    try {
      await account.login(this.loginData);
    } catch (error) {
      throw new Error(JSON.stringify(error));
    }

    if (!conversationIds) {
      const allConversations = await client.api.conversation.getAllConversations();
      const groupConversations = allConversations.filter(conversation => conversation.type === 0);
      conversationIds = groupConversations.map(conversation => conversation.id);
    }

    if (!account.service) {
      throw new Error('Account service is not set. Not logged in?');
    }

    for (const conversationId of conversationIds) {
      if (conversationId) {
        logger.log(`Sending message to conversation "${conversationId}" ...`);
        const textPayload = buildTextMessage({
          text: this.message,
        });
        await account.service.conversation.send({
          conversationId: {id: conversationId, domain: ''},
          protocol: ConversationProtocol.PROTEUS,
          payload: textPayload,
        });
      }
    }
  }

  static async generateChangelog(
    repoSlug: string,
    previousGitTag: string,
    maximumChars?: number,
    excludedCommitTypes?: string[],
  ): Promise<string> {
    const headlines = new RegExp('^#+ (.*)$', 'gm');
    const listItems = new RegExp('^(\\s*)\\* ', 'gm');
    const githubCommitLinks = new RegExp('( \\(\\[#\\d+\\]\\([^)]+\\)\\)) .*$', 'gm');
    const githubPRLinks = new RegExp('(/pull/[\\d]+)\\)', 'gm');
    const omittedMessage = '... (content omitted)';

    const exclude = excludedCommitTypes || ChangelogBot.SETUP.EXCLUDED_COMMIT_TYPES;

    const changelog = await Changelog.generate({
      exclude,
      repoUrl: `https://github.com/${repoSlug}`,
      tag: previousGitTag,
    });

    if (!changelog.match(listItems)) {
      const excludedTypes = exclude.join(', ');
      const errorMessage = `Could not generate a meaningful changelog from the commit types given (excluded "${excludedTypes}").`;
      logger.warn(errorMessage);
      process.exit();
    }

    let styledChangelog = changelog
      .replace(headlines, '**$1**')
      .replace(listItems, '$1- ')
      .replace(githubCommitLinks, '$1')
      .replace(githubPRLinks, '$1/files?diff=unified)');

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
