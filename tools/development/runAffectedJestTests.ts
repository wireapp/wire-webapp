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

import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';

const PROCESS_ARGUMENT_START_INDEX = 2;

interface AffectedJestTestPlan {
  readonly jestTestPaths: readonly string[];
  readonly skippedPlaywrightPaths: readonly string[];
}

export const partitionAffectedJestTests = (testPaths: readonly string[]): AffectedJestTestPlan => {
  const jestTestPaths: string[] = [];
  const skippedPlaywrightPaths: string[] = [];

  for (const testPath of testPaths) {
    const normalizedPath = testPath.replaceAll('\\', '/');
    if (/(^|\/)apps\/webapp\/test\/e2e_tests\//.test(normalizedPath)) {
      skippedPlaywrightPaths.push(testPath);
      continue;
    }

    jestTestPaths.push(testPath);
  }

  return {jestTestPaths, skippedPlaywrightPaths};
};

const getChangedPaths = (arguments_: readonly string[]): string[] => {
  const separatorIndex = arguments_.indexOf('--');
  return [...(separatorIndex < 0 ? arguments_ : arguments_.slice(separatorIndex + 1))];
};

const runAffectedJestTests = (testPaths: readonly string[]): number => {
  if (testPaths.length === 0) {
    console.info('No changed test paths were provided; skipping the affected Jest run.');
    return 0;
  }

  const {jestTestPaths, skippedPlaywrightPaths} = partitionAffectedJestTests(testPaths);
  for (const testPath of skippedPlaywrightPaths) {
    console.info(`Skipping Playwright E2E spec from Jest watcher target: ${testPath}`);
  }

  if (jestTestPaths.length === 0) {
    console.info('No Jest tests remain; all changed test files are Playwright E2E specs.');
    return 0;
  }

  const jestExecutable = resolve('node_modules/.bin/jest');
  const result = spawnSync(jestExecutable, ['--config', './jest.config.js', '--runTestsByPath', ...jestTestPaths], {
    stdio: 'inherit',
  });
  if (result.error !== undefined) {
    console.error(result.error.message);
    return 1;
  }

  return result.status ?? 1;
};

if (require.main === module) {
  process.exitCode = runAffectedJestTests(getChangedPaths(process.argv.slice(PROCESS_ARGUMENT_START_INDEX)));
}
