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

/* eslint-disable header/header */

import {program as commander} from 'commander';
import logdown from 'logdown';

import {Parameters} from './Interfaces';
import {start as startChangelogBot} from './Start';

const {description, version}: {description: string; version: string} = require('../package.json');

const logger = logdown('@wireapp/changelog-bot/cli', {
  logger: console,
  markdown: false,
});

logger.state.isEnabled = true;

commander
  .version(version)
  .description(description)
  .option('-c, --conversations <conversationId,...>', 'The conversation IDs to write in')
  .option('-e, --email <email>', 'Your email address')
  .option('-m, --message <message>', 'Custom message')
  .option('-p, --password <password>', 'Your password')
  .option('-b, --backend <type>', 'Backend type ("production" or "staging")')
  .option('-s, --slug <slug>', 'A repo slug')
  .option('-r, --range <range>', 'The commit range')
  .option('-t, --tag <tag>', 'The commit tag')
  .option('-x, --exclude-commit-types <type,...>', 'Commit types to exclude (e.g. chore,build,...)')
  .parse(process.argv);

const {backend, conversations, email, message, password, range, slug, tag} = commander.opts();

let excludeCommitTypes = commander.opts().excludeCommitTypes ?? process.env.EXCLUDE_COMMIT_TYPES;

if (typeof excludeCommitTypes !== 'undefined') {
  excludeCommitTypes = excludeCommitTypes.includes(',') ? excludeCommitTypes.split(',') : [excludeCommitTypes];
}

const parameters: Parameters = {
  backend: backend,
  conversationIds: conversations || process.env.WIRE_CHANGELOG_BOT_CONVERSATION_IDS,
  email: email || process.env.WIRE_CHANGELOG_BOT_EMAIL,
  excludeCommitTypes,
  message: message,
  password: password || process.env.WIRE_CHANGELOG_BOT_PASSWORD,
  travisCommitRange: range || process.env.TRAVIS_COMMIT_RANGE,
  travisRepoSlug: slug || process.env.TRAVIS_REPO_SLUG,
  travisTag: tag || process.env.TRAVIS_TAG,
};

logger.log(`wire-changelog-bot v${version}`);

startChangelogBot(parameters).catch(error => {
  // Info:
  // Don't log error payloads here (on a global level) as they can leak sensitive information. Stack traces are ok!
  logger.error(error.stack);
  process.exit(1);
});
