/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {spawnSync} from 'child_process';
import * as os from 'os';

export function getCredentials(itemName: string, fieldName: string = 'password'): string {
  const environmentVariable = process.env[itemName];
  if (!environmentVariable) {
    // if environment variable is not set search in 1password
    return readFrom1Password(itemName, fieldName);
  }

  return environmentVariable;
}

function readFrom1Password(itemName: string, fieldName: string): string {
  const homeDir = os.homedir();
  const command = 'op';
  const args = ['item', 'get', '--vault', 'Test Automation', itemName, '--fields', fieldName, '--reveal'];
  const options = {
    cwd: homeDir,
    // eslint-disable-next-line no-undef
    encoding: 'utf8' as BufferEncoding,
  };

  const result = spawnSync(command, args, options);

  if (result.error) {
    throw new Error(`Do you have 1Password CLI installed? Starting 1Password CLI failed: ${result.error.message}`);
  }

  if (result.status === 1) {
    throw new Error(`1Password found none or multiple items for id '${itemName}':\n${result.stderr}`);
  }

  return result.stdout.trim();
}
