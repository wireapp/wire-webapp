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

import type {FireAndForgetInvoker} from '@enormora/fire-and-forget';
import {Maybe} from 'true-myth';

import type {BrowserLogPersistence} from './createBrowserLogPersistence';

import type {QualifiedId} from '../apiClient/user/qualifiedId';

type AuthenticatedAccountBindingDependencies = {
  readonly fireAndForgetInvoker: Pick<FireAndForgetInvoker, 'fireAndForget'>;
  readonly persistence: Maybe<Pick<BrowserLogPersistence, 'bindAccount' | 'dispose'>>;
  readonly hashQualifiedId: (qualifiedId: Readonly<QualifiedId>) => Promise<string>;
  readonly reportFailure: () => void;
};

export function createAuthenticatedAccountBinding(
  dependencies: AuthenticatedAccountBindingDependencies,
): (qualifiedId: Readonly<QualifiedId>) => Promise<void> {
  const {fireAndForgetInvoker, persistence, hashQualifiedId, reportFailure} = dependencies;

  async function disablePersistence(): Promise<void> {
    // Disposal closes write admission synchronously; cleanup acknowledgements are never awaited by startup.
    if (persistence.isJust) {
      await persistence.value.dispose();
    }
  }

  function handleFailure(): void {
    fireAndForgetInvoker.fireAndForget(disablePersistence);
    try {
      reportFailure();
    } catch {
      // Optional diagnostics must not affect authentication either.
    }
  }

  async function onAuthenticatedAccount(qualifiedId: Readonly<QualifiedId>): Promise<void> {
    if (persistence.isNothing) {
      return;
    }

    try {
      // Startup supplies fresh, unattributed persistence for each document; logout/login navigate away.
      // Records accepted while hashing stay unattributed and are drained before binding switches stores.
      const accountIdentifier = await hashQualifiedId(qualifiedId);
      // bindAccount closes the existing write barrier immediately. Its Task contains worker failures as Results.
      // Await hashing to start that transition before ordinary authenticated work, but never await the worker.
      const binding = persistence.value.bindAccount(accountIdentifier).inspectRejected(handleFailure);
      fireAndForgetInvoker.fireAndForget(async () => {
        await binding;
      });
    } catch {
      handleFailure();
    }
  }

  return onAuthenticatedAccount;
}
