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

//@ts-check

const {execSync} = require('child_process');
const logdown = require('logdown');
const moment = require('moment');
const path = require('path');
const readline = require('readline').createInterface(process.stdin, process.stdout);

const currentDate = moment().format('YYYY-MM-DD');
const filename = path.basename(__filename);
const firstArgument = process.argv[2];
const usageText = `Usage: ${filename} [-h|--help] <staging|production> <commitId>`;
let commitId = process.argv[3];
let target = '';
let commitMessage = '';
let branch = '';

const logger = logdown(filename, {
  logger: console,
  markdown: false,
});
logger.state.isEnabled = true;

/**
 * @param {string} command - The command to execute
 * @returns {string} The standard output
 */
const exec = command =>
  execSync(command, {stdio: 'pipe'})
    .toString()
    .trim();

switch (firstArgument) {
  case '--help':
  case '-h': {
    logger.info(usageText);
    process.exit();
  }
  case 'production': {
    branch = 'master';
    target = firstArgument;
    break;
  }
  case 'staging': {
    branch = 'dev';
    target = firstArgument;
    break;
  }
  default: {
    logger.error('No or invalid target specified. Valid targets are: staging, production');
    logger.info(usageText);
    process.exit(1);
  }
}

if (!commitId) {
  logger.info(`No commit ID specified. Will use latest commit from branch "${branch}".`);
  commitId = exec(`git rev-parse ${branch}`);
}

try {
  commitMessage = exec(`git show -s --format=%s ${commitId}`);
} catch (error) {
  logger.error(error.message);
  process.exit(1);
}

const origin = exec('git remote');

logger.info(`Fetching base "${origin}" ...`);
exec(`git fetch ${origin}`);

/**
 * @param {number} index - The tag name index
 * @returns {string} The new tag name
 */
const createTagName = (index = 0) => {
  const newTagName = `${currentDate}-${target}.${index}`;
  const tagExists = !!exec(`git tag -l ${newTagName}`);
  return tagExists ? createTagName(++index) : newTagName;
};

const tagName = createTagName();

/**
 * Callback for returning the answer.
 *
 * @callback AnswerCallback
 * @param {string} answer - The answer.
 */

/**
 * @param {string} query - The question to ask
 * @param {AnswerCallback} callback - The callback to call
 * @returns {void} Nothing
 */
const ask = (query, callback) => {
  readline.question(query, answer => {
    if (/^(yes|no)$/.test(answer)) {
      callback(answer);
    } else {
      ask('⚠️  Please enter yes or no: ', callback);
    }
  });
};

ask(`ℹ️  The commit "${commitMessage}" will be released with tag "${tagName}". Continue? [yes/no] `, answer => {
  if (answer === 'yes') {
    logger.info(`Creating tag "${tagName}" ...`);
    exec(`git tag ${tagName} ${commitId}`);

    logger.info(`Pushing "${tagName}" to "${origin}" ...`);
    exec(`git push ${origin} ${tagName}`);

    logger.info('Done.');
  } else {
    logger.info('Aborting.');
  }

  process.exit();
});
