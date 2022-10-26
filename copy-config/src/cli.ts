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

/* eslint-disable header/header */

import {cosmiconfig} from 'cosmiconfig';
import logdown from 'logdown';

import {CopyConfig, CopyConfigOptions} from './';

const configExplorer = cosmiconfig('copyconfig');
const logger = logdown('@wireapp/copy-config/cli', {
  markdown: false,
});
logger.state.isEnabled = true;

(async () => {
  const configFile = await configExplorer.search();
  if (configFile) {
    logger.info(`Found configuration file "${configFile.filepath}".`);
  }
  const config: CopyConfigOptions = configFile ? configFile.config : undefined;

  const copiedFiles = await new CopyConfig(config).copy();
  const copyMessage = copiedFiles.length ? `Copied ${copiedFiles.length}` : "Didn't copy any";
  logger.info(`${copyMessage} file${copiedFiles.length === 1 ? '' : 's'}.`);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
