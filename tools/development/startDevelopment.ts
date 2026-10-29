/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {checkbox} from '@inquirer/prompts';

import {spawnSync} from 'node:child_process';

import {developmentLibraries, getSelectedLibraryWatchCommands} from './libraryWatchRecipes';

async function main(): Promise<void> {
  const selectedLibraryNames = await checkbox({
    message: 'Select libraries to watch:',
    choices: developmentLibraries,
  });
  const libraryWatchCommands = getSelectedLibraryWatchCommands({libraryNames: selectedLibraryNames});
  const concurrentCommands = ['just watch-server-typescript', 'just run-development-server', ...libraryWatchCommands];
  const concurrentlyResult = spawnSync('concurrently', ['--raw', '--kill-others', ...concurrentCommands], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  if (concurrentlyResult.error !== undefined) {
    throw concurrentlyResult.error;
  }

  process.exitCode = concurrentlyResult.status ?? 1;
}

main().catch((error: unknown): void => {
  console.error(error);
  process.exitCode = 1;
});
