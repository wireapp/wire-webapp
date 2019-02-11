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

import cosmiconfig = require('cosmiconfig');
import * as logdown from 'logdown';

import {CopyConfig, CopyConfigOptions} from './';

const configExplorer = cosmiconfig('copyconfig');
const logger = logdown('@wireapp/copy-config/cli', {
  markdown: false,
});
logger.state.isEnabled = true;

configExplorer
  .search()
  .then(configFile => {
    if (configFile) {
      logger.info(`Found configuration file "${configFile.filepath}".`);
    }
    const config = configFile ? configFile.config : undefined;
    return new CopyConfig(config as CopyConfigOptions).copy();
  })
  .then(copiedFiles => {
    const copyMessage = copiedFiles.length ? `Copied ${copiedFiles.length}` : "Didn't copy any";
    logger.info(`${copyMessage} file${copiedFiles.length === 1 ? '' : 's'}.`);
  })
  .catch(error => {
    console.error(error.stack);
    process.exit(1);
  });
