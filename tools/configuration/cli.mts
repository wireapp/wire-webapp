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

import {isNull, isUndefined} from '@sindresorhus/is';
import {cosmiconfig} from 'cosmiconfig';
import logdown from 'logdown';
import {noop} from 'noop-esm';

import {ConfigurationCopier} from './ConfigurationCopier.mts';
import type {ConfigurationCopyOptions} from './ConfigurationCopyOptions.mts';

async function runConfigurationCopyCommand(): Promise<void> {
  const configurationExplorer = cosmiconfig('copyconfig');
  const configurationFile = await configurationExplorer.search();
  const configurationOptions: ConfigurationCopyOptions | undefined = isNull(configurationFile)
    ? undefined
    : configurationFile.config;

  const logLevel = configurationOptions?.logLevel ?? 'info';
  const logger = logLevel !== 'silent' ? logdown('@wireapp/copy-config', {markdown: false}) : undefined;
  if (!isUndefined(logger)) {
    logger.state.isEnabled = true;
    if (!isNull(configurationFile)) {
      logger.info(`Found configuration file "${configurationFile.filepath}".`);
    }
    if (logLevel !== 'verbose') {
      // Disable debug logging when not in verbose mode
      logger.debug = noop;
    }
  }

  const copiedDestinationPaths = await new ConfigurationCopier(configurationOptions, logger).copyConfigurationFiles();
  const configurationCopyMessage = Boolean(copiedDestinationPaths.length)
    ? `Copied ${copiedDestinationPaths.length}`
    : "Didn't copy any";
  logger?.info(`${configurationCopyMessage} file${copiedDestinationPaths.length === 1 ? '' : 's'}.`);
}

try {
  await runConfigurationCopyCommand();
} catch (error: unknown) {
  console.error(error);
  process.exitCode = 1;
}
