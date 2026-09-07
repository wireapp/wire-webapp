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

import {closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync} from 'fs';
import {dirname, resolve} from 'path';
import {spawn} from 'child_process';

const lockPath = resolve(process.cwd(), '.tmp/server-dev.lock');

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readLockOwner(): number | undefined {
  try {
    const pid = Number.parseInt(readFileSync(lockPath, 'utf8').trim(), 10);
    return Number.isInteger(pid) && pid > 0 ? pid : undefined;
  } catch {
    return undefined;
  }
}

function acquireLock(): number {
  mkdirSync(dirname(lockPath), {recursive: true});

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const descriptor = openSync(lockPath, 'wx');
      writeFileSync(descriptor, String(process.pid));
      return descriptor;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }

      const owner = readLockOwner();
      if (owner !== undefined && isProcessRunning(owner)) {
        throw new Error(`A development server is already running (pid ${owner}). Stop it before starting another one.`);
      }

      unlinkSync(lockPath);
    }
  }

  throw new Error(`Could not acquire development server lock at ${lockPath}`);
}

function releaseLock(descriptor: number): void {
  closeSync(descriptor);

  if (readLockOwner() === process.pid && existsSync(lockPath)) {
    unlinkSync(lockPath);
  }
}

function main(): void {
  const lockDescriptor = acquireLock();
  let released = false;

  const release = () => {
    if (!released) {
      released = true;
      releaseLock(lockDescriptor);
    }
  };

  process.once('exit', release);

  const nxCli = require.resolve('nx/bin/nx.js');
  const server = spawn(process.execPath, [nxCli, 'serve', 'server'], {
    env: process.env,
    stdio: 'inherit',
  });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => server.kill(signal));
  }

  server.once('error', error => {
    release();
    console.error(error);
    process.exitCode = 1;
  });

  server.once('exit', (code, signal) => {
    release();
    process.exitCode = code ?? (signal === null ? 1 : 0);
  });
}

main();
