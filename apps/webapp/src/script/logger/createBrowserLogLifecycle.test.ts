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

import {Maybe} from 'true-myth';

import {createBrowserLogLifecycle} from './createBrowserLogLifecycle';
import type {BrowserLogPersistence} from './createBrowserLogPersistence';

const account = {id: '00000000-0000-4000-8000-000000000001', domain: 'example.com'};
const accountIdentifier = 'a'.repeat(64);

function createLifecycleForTest(): {
  readonly lifecycle: ReturnType<typeof createBrowserLogLifecycle>;
  readonly calls: string[];
  readonly failures: unknown[];
  readonly state: {workerFails: boolean; disposalFails: boolean};
} {
  const calls: string[] = [];
  const failures: unknown[] = [];
  const state = {workerFails: false, disposalFails: false};
  const persistence: BrowserLogPersistence = {
    write() {},
    async flush() {},
    async setAccount(getAccountIdentifier) {
      const identifier = await getAccountIdentifier();
      calls.push(`bind:${identifier}`);
    },
    async dispose() {
      calls.push('dispose');
      if (state.disposalFails) {
        throw new Error('Persistence worker failed');
      }
    },
    getStatistics() {
      return {droppedRecords: 0, failures: 0, pendingBytes: 0, suspended: false};
    },
  };
  const lifecycle = createBrowserLogLifecycle({
    persistence: Maybe.just(persistence),
    isElectron: false,
    async getAccountIdentifier(qualifiedAccount) {
      expect(qualifiedAccount).toEqual(account);
      calls.push('identify');

      return accountIdentifier;
    },
    createCleanupClient() {
      calls.push('create-cleanup-worker');

      return Maybe.just({
        async removeAccountLogs(identifier) {
          calls.push(`remove:${identifier}`);
          if (state.workerFails) {
            throw new Error('Cleanup worker failed');
          }
        },
        async shutdown() {
          calls.push('shutdown-cleanup-worker');
        },
      });
    },
    reportFailure(error) {
      failures.push(error);
    },
  });

  return {lifecycle, calls, failures, state};
}

describe('browser log account lifecycle', () => {
  it('binds only the authenticated account and stops its writer before explicit removal', async () => {
    const {lifecycle, calls, failures} = createLifecycleForTest();
    expect(calls).toEqual([]);

    await lifecycle.setAccount(account);
    await lifecycle.removeAccount();

    expect(calls).toEqual([
      'identify',
      `bind:${accountIdentifier}`,
      'dispose',
      'identify',
      'create-cleanup-worker',
      `remove:${accountIdentifier}`,
      'shutdown-cleanup-worker',
    ]);
    expect(failures).toEqual([]);
  });

  it('cleans previously persisted logs even with persistence disabled', async () => {
    const calls: string[] = [];
    const lifecycle = createBrowserLogLifecycle({
      persistence: Maybe.nothing(),
      isElectron: false,
      async getAccountIdentifier() {
        return accountIdentifier;
      },
      createCleanupClient() {
        return Maybe.just({
          async removeAccountLogs(identifier) {
            calls.push(identifier);
          },
          async shutdown() {},
        });
      },
      reportFailure(error): never {
        throw error;
      },
    });

    await lifecycle.setAccount(account);
    expect(calls).toEqual([]);
    await lifecycle.removeAccount();
    await lifecycle.removeAccount(account);

    expect(calls).toEqual([accountIdentifier, accountIdentifier]);
  });

  it('keeps Electron entirely outside the browser log lifecycle', async () => {
    const lifecycle = createBrowserLogLifecycle({
      persistence: Maybe.nothing(),
      isElectron: true,
      async getAccountIdentifier(): Promise<never> {
        throw new Error('Electron must not identify browser logs');
      },
      createCleanupClient(): never {
        throw new Error('Electron must not create cleanup workers');
      },
      reportFailure(): never {
        throw new Error('No browser operation expected');
      },
    });

    await lifecycle.setAccount(account);
    await lifecycle.removeAccount(account);
  });

  it('attempts cleanup after writer failure and contains cleanup worker failures', async () => {
    const {lifecycle, state, calls, failures} = createLifecycleForTest();
    state.disposalFails = true;
    state.workerFails = true;

    await lifecycle.removeAccount(account);

    expect(calls).toContain(`remove:${accountIdentifier}`);
    expect(calls.at(-1)).toBe('shutdown-cleanup-worker');
    expect(failures).toHaveLength(2);
  });

  it('never guesses ownership or deletes all logs when no account is known', async () => {
    const {lifecycle, calls} = createLifecycleForTest();

    await lifecycle.removeAccount();

    expect(calls).toEqual(['dispose']);
  });
});
