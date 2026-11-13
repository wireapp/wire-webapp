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

import {createClock} from '@enormora/clock/clock';
import {createFireAndForgetInvoker} from '@enormora/fire-and-forget';
import {isFunction, isUndefined} from '@sindresorhus/is';
import {Maybe} from 'true-myth';

import {createAccountLogMaintenance} from './createAccountLogMaintenance';
import {createLogWorkerProcessor} from './createLogWorkerProcessor';
import {
  createOriginPrivateFileSystemLogStore,
  type LogDirectory,
  type LogFileHandle,
  type LogStore,
} from './createOriginPrivateFileSystemLogStore';
import {logPersistenceConfiguration} from './logPersistenceConfiguration';
import type {LogWorkerResponse} from './logWorkerProtocol';

type LogPersistenceWorkerScope = {
  readonly navigator: {
    readonly storage: {readonly getDirectory: () => Promise<LogDirectory>};
    readonly locks?: Pick<LockManager, 'request'>;
  };
  readonly crypto: Pick<Crypto, 'randomUUID'>;
  readonly FileSystemFileHandle: {readonly prototype: Pick<LogFileHandle, 'createSyncAccessHandle'>};
  readonly postMessage: (response: LogWorkerResponse) => void;
  readonly addEventListener: (name: 'message', listener: (event: MessageEvent<unknown>) => void) => void;
  readonly close: () => void;
};

// This facade describes worker-only APIs absent from the application's DOM TypeScript library.
const workerScope = self as unknown as LogPersistenceWorkerScope;

function supportsWorkerLogPersistence(): boolean {
  return (
    isFunction(workerScope.navigator.storage?.getDirectory) &&
    isFunction(workerScope.FileSystemFileHandle?.prototype.createSyncAccessHandle)
  );
}

function createStore(accountIdentifier?: string): LogStore {
  return createOriginPrivateFileSystemLogStore({
    clock: createClock(),
    sessionIdentifier: workerScope.crypto.randomUUID(),
    accountIdentifier,
    configuration: logPersistenceConfiguration,
    getDirectory() {
      return workerScope.navigator.storage.getDirectory();
    },
  });
}

function runExclusive<Value>(operation: () => Promise<Value>): Promise<Value> {
  const locks = workerScope.navigator.locks;
  if (isUndefined(locks) || !isFunction(locks.request)) {
    throw new Error('Account log coordination unsupported');
  }

  return locks.request('wire-browser-log-maintenance-v1', operation);
}

const accountMaintenance = createAccountLogMaintenance({
  getDirectory() {
    return workerScope.navigator.storage.getDirectory();
  },
  runExclusive,
  createStore,
  createGenerationIdentifier() {
    return workerScope.crypto.randomUUID();
  },
});

async function initialize(accountIdentifier?: string): Promise<Maybe<LogStore>> {
  if (!supportsWorkerLogPersistence()) {
    return Maybe.nothing();
  }

  if (!isUndefined(accountIdentifier)) {
    return Maybe.just(await accountMaintenance.activateAccount(accountIdentifier));
  }

  if (isFunction(workerScope.navigator.locks?.request)) {
    await accountMaintenance.observeAccountGenerations();
  }
  const store = createStore();

  return Maybe.just({
    async append(lines) {
      if (isFunction(workerScope.navigator.locks?.request)) {
        await runExclusive(() => {
          return store.append(lines);
        });
      } else {
        // Preserve pre-authentication logging on browsers without cross-worker coordination.
        await store.append(lines);
      }
    },
  });
}

const processor = createLogWorkerProcessor({
  initialize,
  removeAccountLogs: accountMaintenance.removeAccount,
  maximumBatchBytes: logPersistenceConfiguration.maximumPendingBytes,
  respond(response) {
    workerScope.postMessage(response);
  },
  close() {
    workerScope.close();
  },
});
const fireAndForgetInvoker = createFireAndForgetInvoker({
  reportError() {
    // An unexpected processor failure disables this destination without logging recursively.
    workerScope.postMessage({requestIdentifier: 0, outcome: 'failed'});
    workerScope.close();
  },
});

workerScope.addEventListener('message', event => {
  fireAndForgetInvoker.fireAndForget(() => {
    return processor.receive(event.data);
  });
});
