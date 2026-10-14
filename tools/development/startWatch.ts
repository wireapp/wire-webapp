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
import {type ChildProcess, spawn} from 'child_process';

const LIBRARIES = [
  {name: 'react-ui-kit', value: 'react-ui-kit-lib', checked: true},
  {name: 'api-client', value: 'api-client-lib', checked: true},
  {name: 'core-lib', value: 'core-lib'},
  {name: 'commons', value: 'commons-lib'},
  {name: 'bazinga64', value: 'bazinga64-lib'},
  {name: 'config', value: 'config-lib'},
  {name: 'copy-config', value: 'copy-config-lib'},
  {name: 'priority-queue', value: 'priority-queue-lib'},
  {name: 'store-engine', value: 'store-engine-lib'},
  {name: 'store-engine-fs', value: 'store-engine-fs-lib'},
  {name: 'store-engine-dexie', value: 'store-engine-dexie-lib'},
  {name: 'webapp-events', value: 'webapp-events-lib'},
  {name: 'telemetry', value: 'telemetry-lib'},
  {name: 'certificate-check', value: 'certificate-check-lib'},
  {name: 'license-collector', value: 'license-collector-lib'},
] as const;

async function main() {
  const selected = await checkbox({
    message: 'Select libraries to watch:',
    choices: LIBRARIES,
  });

  const proc: ChildProcess = spawn('nx', ['serve', 'server'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {...process.env, WATCH_LIBS: selected.join(',')},
  });

  process.once('SIGINT', () => {
    proc.kill('SIGINT');
    process.exitCode = 130;
  });
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
