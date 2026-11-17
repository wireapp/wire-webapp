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
import {deleteAccountBrowserLogs, type AccountLogDirectory} from './deleteAccountBrowserLogs';

import {QualifiedIdSchema, type QualifiedId} from '../apiClient/user/qualifiedId';

type AccountLogCleanupDependencies = {
  readonly isElectron: boolean;
  readonly persistence: Maybe<Pick<BrowserLogPersistence, 'dispose'>>;
  readonly hashQualifiedId: (qualifiedId: Readonly<QualifiedId>) => Promise<string>;
  readonly getDirectory: () => Promise<AccountLogDirectory>;
  readonly reportFailure: () => void;
};

export function createAccountLogCleanup(
  dependencies: AccountLogCleanupDependencies,
): (qualifiedId: Maybe<Readonly<QualifiedId>>) => Promise<void> {
  const {isElectron, persistence, hashQualifiedId, getDirectory, reportFailure} = dependencies;

  async function cleanupAccountLogs(qualifiedId: Maybe<Readonly<QualifiedId>>): Promise<void> {
    if (isElectron) {
      return;
    }

    try {
      // dispose closes write admission before its first await, drains binding/writes and terminates the worker.
      if (persistence.isJust) {
        await persistence.value.dispose();
      }
      if (qualifiedId.isNothing) {
        reportFailure();

        return;
      }
      const identity = QualifiedIdSchema.safeParse(qualifiedId.value);
      if (!identity.success) {
        reportFailure();

        return;
      }
      const accountIdentifier = await hashQualifiedId(identity.data);
      await deleteAccountBrowserLogs({getDirectory, accountIdentifier}).inspectRejected(() => {
        reportFailure();
      });
    } catch {
      // Never include storage errors, filenames or account identity in diagnostics.
      reportFailure();
    }
  }

  return cleanupAccountLogs;
}
