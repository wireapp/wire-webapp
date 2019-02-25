#!/usr/bin/env node

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
import * as path from 'path';
import {MessageData, TravisBot} from './';

import logdown from 'logdown';
const {version}: {version: string} = require('../package.json');

const logger = logdown('@wireapp/travis-bot/cli', {
  logger: console,
  markdown: false,
});

const scriptName = path.basename(process.argv[1]);

const requiredEnvVars = ['WIRE_WEBAPP_BOT_EMAIL', 'WIRE_WEBAPP_BOT_PASSWORD'];
const travisEnvVars = ['TRAVIS_BRANCH', 'TRAVIS_BUILD_NUMBER', 'TRAVIS_COMMIT', 'TRAVIS_REPO_SLUG'];

const setBold = (text: string): string => `\x1b[1m${text}\x1b[0m`;

const usage = (): void => {
  console.info(`${setBold('Usage:')} ${scriptName} <conversation id(s)>\n`);
  console.info(
    `${setBold('Example:')} ${scriptName} "e4302e84-75fd-4dc7-8a16-67018bd94ce7,44be7db8-7b7c-4acf-887d-86fbb9a5508f"`
  );
};
const envVarUsage = (): void => console.info(setBold('Required environment variables:'), requiredEnvVars.join(', '));

const start = async (): Promise<TravisBot> => {
  const {WIRE_WEBAPP_BOT_EMAIL, WIRE_WEBAPP_BOT_PASSWORD, WIRE_WEBAPP_BOT_CONVERSATION_IDS} = process.env;
  const {TRAVIS_BRANCH, TRAVIS_BUILD_NUMBER, TRAVIS_COMMIT, TRAVIS_REPO_SLUG, TRAVIS_TAG} = process.env;

  const commitAuthor = await TravisBot.runCommand(`git log | grep Author: | cut -d' ' -f2- | uniq | head -n1`);
  const commitSummary = await TravisBot.runCommand('git log -1 --pretty=%s');
  let changelog;

  if (TRAVIS_TAG) {
    const MAXIMUM_CHANGELOG_CHARS = 800;

    const previousGitTag = await TravisBot.runCommand(`git describe --abbrev=0 --tags ${TRAVIS_TAG}^`);

    changelog = await TravisBot.generateChangelog(
      String(TRAVIS_REPO_SLUG),
      `${previousGitTag}..${TRAVIS_TAG}`,
      MAXIMUM_CHANGELOG_CHARS
    );
  }

  const loginData: LoginData = {
    clientType: ClientType.TEMPORARY,
    email: WIRE_WEBAPP_BOT_EMAIL,
    password: WIRE_WEBAPP_BOT_PASSWORD,
  };

  const messageData: MessageData = {
    build: {
      number: String(TRAVIS_BUILD_NUMBER),
      repositoryName: String(TRAVIS_REPO_SLUG),
      url: '',
    },
    changelog,
    commit: {
      author: commitAuthor,
      branch: String(TRAVIS_BRANCH),
      hash: String(TRAVIS_COMMIT),
      message: commitSummary,
    },
  };

  if (WIRE_WEBAPP_BOT_CONVERSATION_IDS) {
    messageData.conversationIds = WIRE_WEBAPP_BOT_CONVERSATION_IDS.replace(' ', '').split(',');
  }

  logger.log('Booting up ...');

  const bot = new TravisBot(loginData, messageData);
  await bot.start();

  return bot;
};

logger.log(setBold(`wire-travis-bot v${version}\n`));

const SECOND_ARGUMENT = 2;

switch (process.argv[SECOND_ARGUMENT]) {
  case '-help':
  case '--help':
  case '-h':
  case '--h': {
    usage();
    envVarUsage();
    process.exit(0);
  }
  default: {
    if (process.argv[SECOND_ARGUMENT]) {
      process.env.WIRE_WEBAPP_BOT_CONVERSATION_IDS = process.argv[SECOND_ARGUMENT];
    }
  }
}

travisEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(
      `${setBold(
        'Error:'
      )} Travis environment variable "${envVar}" is not set.\nRead more: https://docs.travis-ci.com/user/environment-variables/#Default-Environment-Variables`
    );
    process.exit(1);
  }
});

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`Error: Environment variable "${envVar}" is not set.`);
    envVarUsage();
    process.exit(1);
  }
});

start()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
