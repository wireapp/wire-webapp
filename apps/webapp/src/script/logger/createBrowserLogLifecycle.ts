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

import type {BrowserLogPersistence} from './createBrowserLogPersistence';
import type {LogWorkerClient} from './createLogWorkerClient';

import type {QualifiedId} from '../apiClient/user/qualifiedId';

type BrowserLogLifecycleOptions = {
  readonly persistence: Maybe<BrowserLogPersistence>;
  readonly createCleanupClient: () => Maybe<Pick<LogWorkerClient, 'removeAccountLogs' | 'shutdown'>>;
  readonly getAccountIdentifier: (account: Readonly<QualifiedId>) => Promise<string>;
  readonly isElectron: boolean;
  readonly reportFailure: (error: unknown) => void;
};

export type BrowserLogLifecycle = {
  readonly setAccount: (account: Readonly<QualifiedId>) => Promise<void>;
  readonly removeAccount: (account?: Readonly<QualifiedId>) => Promise<void>;
};

export function createBrowserLogLifecycle(options: BrowserLogLifecycleOptions): BrowserLogLifecycle {
  const {persistence, createCleanupClient, getAccountIdentifier, isElectron, reportFailure} = options;
  let currentAccount: Maybe<Readonly<QualifiedId>> = Maybe.nothing();

  function reportSafely(error: unknown): void {
    try {
      reportFailure(error);
    } catch {
      // Diagnostics must never interrupt authentication or account-data removal.
    }
  }

  async function setAccount(account: Readonly<QualifiedId>): Promise<void> {
    if (isElectron) {
      return;
    }

    currentAccount = Maybe.just({...account});
    if (persistence.isNothing) {
      return;
    }

    try {
      await persistence.value.setAccount(() => {
        return getAccountIdentifier(account);
      });
    } catch (error: unknown) {
      reportSafely(error);
      try {
        await persistence.value.dispose();
      } catch (disposalError: unknown) {
        reportSafely(disposalError);
      }
    }
  }

  async function removeAccount(account?: Readonly<QualifiedId>): Promise<void> {
    if (isElectron) {
      return;
    }

    const accountToRemove = Maybe.of(account).or(currentAccount);
    // Stop the local output first, including pending writes. Other workers are revoked by durable metadata.
    if (persistence.isJust) {
      try {
        await persistence.value.dispose();
      } catch (error: unknown) {
        reportSafely(error);
      }
    }
    if (accountToRemove.isNothing) {
      return;
    }

    try {
      const accountIdentifier = await getAccountIdentifier(accountToRemove.value);
      // Cleanup is deliberately independent of the startup persistence toggle.
      const client = createCleanupClient();
      if (client.isNothing) {
        throw new Error('Browser log cleanup worker unavailable');
      }

      try {
        await client.value.removeAccountLogs(accountIdentifier);
      } finally {
        await client.value.shutdown();
      }
    } catch (error: unknown) {
      reportSafely(error);
    }
  }

  return {setAccount, removeAccount};
}
