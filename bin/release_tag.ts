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

import {execSync} from 'child_process';
import logdown from 'logdown';
import path from 'path';
import readline from 'readline';

require('dotenv').config();

enum DeploymentStage {
  PRODUCTION = 'production',
  STAGING = 'staging',
}

const input = readline.createInterface(process.stdin, process.stdout);

const currentDate = new Date().toISOString().substring(0, 10);
const filename = path.basename(__filename);
const stage = process.argv[2];
const usageText = `Usage: ${filename} [-h|--help] <staging|production> <commitId>`;

const exec = (command: string): string => execSync(command, {stdio: 'pipe'}).toString().trim();

let commitId = process.argv[3];
let target = '';
let commitMessage = '';
let branch = exec('git rev-parse --abbrev-ref HEAD');
const isDryRun = process.argv.includes('--dry-run');

const logger = logdown(filename, {
  logger: console,
  markdown: false,
});
logger.state.isEnabled = true;

if (isDryRun) {
  logger.info('Note: Dry run enabled.');
}

switch (stage) {
  case '--help':
  case '-h': {
    logger.info(usageText);
    process.exit();
  }
  case DeploymentStage.PRODUCTION: {
    target = stage;
    break;
  }
  case DeploymentStage.STAGING: {
    target = stage;
    break;
  }
  default: {
    logger.error('No or invalid target specified. Valid targets are: staging, production');
    logger.info(usageText);
    process.exit(1);
  }
}

if (commitId) {
  logger.info(`Got commit ID "${commitId}".`);

  if (stage === DeploymentStage.PRODUCTION || stage === DeploymentStage.STAGING) {
    // If we're releasing to production, we need to ensure the commitId is part of the master branch.
    const commitBranch = exec(`git branch --contains ${commitId} --format="%(refname:short)"`)
      .split('\n')
      .map(branch => branch.trim());
    console.info(commitBranch);
    if (!commitBranch.includes(branch)) {
      logger.error(`Commit ID "${commitId}" is not part of the ${branch} branch. Aborting.`);
      process.exit(1);
    }
  }
} else {
  logger.info(`No commit ID specified. Will use latest commit from branch "${branch}".`);
  commitId = exec(`git rev-parse ${branch}`);
}

try {
  commitMessage = exec(`git show -s --format=%s ${commitId}`);
} catch (error: any) {
  logger.error(error.message);
  process.exit(1);
}

const origin = exec('git remote');

logger.info(`Fetching base "${origin}" ...`);
exec(`git fetch ${origin}`);

const createTagName = (index: number = 0): string => {
  const newTagName = `${currentDate}-${target}.${index}`;
  const tagExists = !!exec(`git tag -l ${newTagName}`);
  return tagExists ? createTagName(++index) : newTagName;
};

const tagName = createTagName();

const ask = (questionToAsk: string): Promise<string> => {
  return new Promise(resolve => {
    input.question(questionToAsk, (answer: string) => {
      if (/^(yes|no)$/.test(answer)) {
        resolve(answer);
      } else {
        resolve(ask('⚠️  Please enter yes or no: '));
      }
    });
  });
};

(async () => {
  if (branch !== 'master' && target === DeploymentStage.PRODUCTION) {
    const answer = await ask(
      `⚠️  You are about to release a commit from branch "${branch}" to production. ARE YOU SURE?? [yes/no] `,
    );
    if (answer !== 'yes') {
      logger.info('Aborting.');
      process.exit();
    }
  }
  const answer = await ask(
    `ℹ️  The commit "${commitMessage}" will be released with tag "${tagName}". Continue? [yes/no] `,
  );
  if (answer === 'yes') {
    logger.info(`Creating tag "${tagName}" ...`);
    if (!isDryRun) {
      exec(`git tag ${tagName} ${commitId}`);
      logger.info(`Pushing "${tagName}" to "${origin}" ...`);
      exec(`git push origin && git push ${origin} ${tagName}`);
    }

    logger.info('Done.');
  } else {
    logger.info('Aborting.');
  }

  process.exit();
})().catch(error => {
  logger.error(error);
  process.exit(1);
});
