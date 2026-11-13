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

import type {Clock} from '@enormora/clock/clock';
import {createFireAndForgetInvoker} from '@enormora/fire-and-forget';
import {isUndefined} from '@sindresorhus/is';
import {Maybe} from 'true-myth';

import {
  createBufferedLogOutput,
  type BufferedLogOutput,
  type LogPersistenceStatistics,
} from './createBufferedLogOutput';
import {createLogWorkerClient, type LogWorkerConnection} from './createLogWorkerClient';
import {logPersistenceConfiguration} from './logPersistenceConfiguration';

type BrowserLogPersistenceOptions = {
  readonly clock: Pick<Clock, 'setTimeout' | 'clearTimeout'>;
  readonly createWorker: () => Maybe<LogWorkerConnection>;
  readonly lifecycle: {
    readonly isHidden: () => boolean;
    readonly subscribeToVisibilityChanges: (listener: () => void) => () => void;
  };
};

export type BrowserLogPersistence = BufferedLogOutput & {
  readonly setAccount: (getAccountIdentifier: () => Promise<string>) => Promise<void>;
};

export function createBrowserLogPersistence(options: BrowserLogPersistenceOptions): Maybe<BrowserLogPersistence> {
  const {clock, createWorker, lifecycle} = options;
  const connection = createWorker();
  if (connection.isNothing) {
    return Maybe.nothing();
  }

  const client = createLogWorkerClient({
    connection: connection.value,
    clock,
    responseTimeoutMilliseconds: logPersistenceConfiguration.workerResponseTimeoutMilliseconds,
  });
  const output = createBufferedLogOutput({clock, append: client.append, configuration: logPersistenceConfiguration});
  let lifecycleFailures = 0;
  let transitionDroppedRecords = 0;
  let acceptingRecords = true;
  let disposed = false;
  let accountTransition: Promise<void> | undefined;
  let disposal: Promise<void> | undefined;
  const fireAndForgetInvoker = createFireAndForgetInvoker({
    reportError() {
      lifecycleFailures += 1;
    },
  });

  function flushWhenHidden(): void {
    // Best effort only: browser termination does not wait for asynchronous lifecycle work.
    if (lifecycle.isHidden()) {
      fireAndForgetInvoker.fireAndForget(flush);
    }
  }

  const stopObservingVisibility = lifecycle.subscribeToVisibilityChanges(flushWhenHidden);
  // Start initialization and retention without blocking application startup.
  fireAndForgetInvoker.fireAndForget(output.flush);

  async function flush(): Promise<void> {
    await accountTransition;
    if (!disposed) {
      await output.flush();
    }
  }

  async function bindAccount(getAccountIdentifier: () => Promise<string>): Promise<void> {
    await output.flush();
    await client.setAccount(await getAccountIdentifier());
    acceptingRecords = !disposed;
  }

  async function completeAccountTransition(transition: Promise<void>): Promise<void> {
    try {
      await transition;
    } finally {
      accountTransition = undefined;
    }
  }

  function setAccount(getAccountIdentifier: () => Promise<string>): Promise<void> {
    acceptingRecords = false;
    if (disposed) {
      return Promise.resolve();
    }
    if (!isUndefined(accountTransition)) {
      return Promise.reject(new Error('Log account transition already in progress'));
    }

    accountTransition = bindAccount(getAccountIdentifier);

    return completeAccountTransition(accountTransition);
  }

  function write(line: string, level: Parameters<BufferedLogOutput['write']>[1]): void {
    if (!acceptingRecords) {
      transitionDroppedRecords += 1;

      return;
    }

    output.write(line, level);
  }

  async function stopPersistence(): Promise<void> {
    stopObservingVisibility();
    try {
      await accountTransition;
    } catch {
      lifecycleFailures += 1;
    }
    await output.dispose();
    try {
      await client.shutdown();
    } catch {
      lifecycleFailures += 1;
    }
  }

  function dispose(): Promise<void> {
    disposed = true;
    acceptingRecords = false;
    if (isUndefined(disposal)) {
      disposal = stopPersistence();
    }

    return disposal;
  }

  function getStatistics(): LogPersistenceStatistics {
    const statistics = output.getStatistics();

    return {
      ...statistics,
      failures: statistics.failures + lifecycleFailures,
      droppedRecords: statistics.droppedRecords + transitionDroppedRecords,
    };
  }

  return Maybe.just({write, flush, setAccount, dispose, getStatistics});
}

export function createLogWorkerConnection(
  worker: Pick<Worker, 'postMessage' | 'addEventListener' | 'removeEventListener' | 'terminate'>,
): LogWorkerConnection {
  return {
    postMessage(request) {
      worker.postMessage(request);
    },
    subscribe(listeners) {
      function onMessage(event: MessageEvent<unknown>): void {
        listeners.onMessage(event.data);
      }
      function onFailure(event: Event): void {
        event.preventDefault();
        listeners.onFailure();
      }

      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onFailure);
      worker.addEventListener('messageerror', onFailure);

      return function unsubscribe() {
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onFailure);
        worker.removeEventListener('messageerror', onFailure);
      };
    },
    terminate() {
      worker.terminate();
    },
  };
}
