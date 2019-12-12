#!/usr/bin/env node

/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

const {execSync} = require('child_process');
const moment = require('moment');
const path = require('path');
const logdown = require('logdown');

const firstArgument = process.argv[2];
const filename = path.basename(__filename);
const usageText = `Usage: "${filename} <commitId>"`;

const logger = logdown(filename, {
  logger: console,
  markdown: false,
});
logger.state.isEnabled = true;

const exec = command =>
  execSync(command, {stdio: 'pipe'})
    .toString()
    .trim();

if (!firstArgument) {
  logger.error(`No commit ID specified. ${usageText}`);
  process.exit(1);
}

if (firstArgument === '--help' || firstArgument === '-h') {
  logger.info(usageText);
  process.exit();
}

try {
  exec(`git show ${firstArgument}`);
} catch (error) {
  logger.error(error.message);
  process.exit(1);
}

const origin = exec('git remote');

logger.log(`Fetching base "${origin}" ...`);
exec(`git fetch ${origin}`);

const createTagName = (index = 0) => {
  const newTagName = `${moment().format('YYYY-MM-DD')}-staging.${index}`;
  const tagExists = exec(`git tag -l ${newTagName}`);
  return tagExists ? createTagName(++index) : newTagName;
};

const tagName = createTagName();

logger.log(`Creating tag "${tagName}" ...`);
exec(`git tag ${tagName} ${firstArgument}`);

logger.log(`Pushing "${tagName}" to "${origin}" ...`);
exec(`git push ${origin} ${tagName}`);

logger.log('Done.');
