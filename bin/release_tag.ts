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

import {APIClient} from '@wireapp/api-client';
import {ClientType} from '@wireapp/api-client/src/client';
import {GIPHY_RATING} from '@wireapp/api-client/src/giphy/';
import {Account} from '@wireapp/core';
import {execSync} from 'child_process';
import logdown from 'logdown';
import axios from 'axios';
import path from 'path';
import readline from 'readline';

require('dotenv').config();

const input = readline.createInterface(process.stdin, process.stdout);

const currentDate = new Date().toISOString().substring(0, 10);
const filename = path.basename(__filename);
const firstArgument = process.argv[2];
const usageText = `Usage: ${filename} [-h|--help] <staging|production> <commitId>`;

let commitId = process.argv[3];
let target = '';
let commitMessage = '';
let branch = '';
const isDryRun = process.argv.includes('--dry-run');

const logger = logdown(filename, {
  logger: console,
  markdown: false,
});
logger.state.isEnabled = true;

const exec = (command: string): string => execSync(command, {stdio: 'pipe'}).toString().trim();

if (!isDryRun) {
  logger.info('Note: Dry run enabled.');
}

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

if (commitId) {
  logger.info(`Got commit ID "${commitId}".`);
} else {
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

const sendRandomGif = async (account: Account, conversationId: string, query: string): Promise<void> => {
  const giphySearchResult = await account.service.giphy.getRandomGif(query, GIPHY_RATING.ALL_AGES_AND_PEOPLE);
  if (!giphySearchResult.data) {
    logger.warn(`No gif found for search query "${query}" :(`);
    return;
  }

  const {
    id,
    images: {
      downsized_large: {url: imageURL, height: imageHeight, width: imageWidth},
    },
  } = giphySearchResult.data;
  const {data: fileBuffer} = await axios.get<Buffer>(imageURL, {responseType: 'arraybuffer'});

  const payload = account.service.conversation.messageBuilder
    .createText(conversationId, `${query} • via giphy.com`)
    .build();
  await account.service.conversation.send(payload);

  const fileMetaDataPayload = account.service.conversation.messageBuilder.createFileMetadata(conversationId, {
    length: fileBuffer.length,
    name: `${id}.gif`,
    type: 'image/gif',
  });
  await account.service.conversation.send(fileMetaDataPayload);

  try {
    const filePayload = await account.service.conversation.messageBuilder.createImage(
      conversationId,
      {data: fileBuffer, height: Number(imageHeight), type: 'image/gif', width: Number(imageWidth)},
      fileMetaDataPayload.id,
    );
    await account.service.conversation.send(filePayload);
  } catch (error) {
    logger.warn(`Error while sending asset: "${error.stack}"`);
    const fileAbortPayload = await account.service.conversation.messageBuilder.createFileAbort(
      conversationId,
      0,
      fileMetaDataPayload.id,
    );
    await account.service.conversation.send(fileAbortPayload);
  }
};

const announceRelease = async (tagName: string, commitId: string): Promise<void> => {
  const {WIRE_EMAIL, WIRE_PASSWORD, WIRE_CONVERSATION} = process.env;
  if (WIRE_EMAIL && WIRE_PASSWORD && WIRE_CONVERSATION) {
    if (isDryRun) {
      return;
    }
    const apiClient = new APIClient({urls: APIClient.BACKEND.PRODUCTION});
    const account = new Account(apiClient);
    await account.login({
      clientType: ClientType.TEMPORARY,
      email: WIRE_EMAIL,
      password: WIRE_PASSWORD,
    });
    const message = `Released tag "${tagName}" based on commit ID "${commitId}".`;
    const payload = account.service.conversation.messageBuilder.createText(WIRE_CONVERSATION, message).build();
    await sendRandomGif(account, WIRE_CONVERSATION, 'in the oven');
    await account.service.conversation.send(payload);
    logger.info(`Sent announcement to conversation "${process.env.WIRE_CONVERSATION}".`);
  } else {
    logger.info(`WIRE_EMAIL, WIRE_PASSWORD or WIRE_CONVERSATION missing. No announcement sent.`);
  }
};

(async () => {
  const answer = await ask(
    `ℹ️  The commit "${commitMessage}" will be released with tag "${tagName}". Continue? [yes/no] `,
  );
  if (answer === 'yes') {
    logger.info(`Creating tag "${tagName}" ...`);
    if (!isDryRun) {
      exec(`git tag ${tagName} ${commitId}`);
    }

    logger.info(`Pushing "${tagName}" to "${origin}" ...`);
    if (!isDryRun) {
      exec(`git push ${origin} ${tagName}`);
    }

    try {
      logger.info(`Announcing release of "${tagName}" ...`);
      await announceRelease(tagName, commitId);
    } catch (error) {
      logger.error(error);
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
