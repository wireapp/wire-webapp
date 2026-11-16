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

import type {LogStore} from './createOriginPrivateFileSystemLogStore';
import {
  isLogWorkerAccountBindingAttempt,
  parseLogWorkerRequest,
  type LogWorkerCommand,
  type LogWorkerResponse,
} from './logWorkerProtocol';

type LogWorkerProcessorOptions = {
  readonly initialize: (accountIdentifier: Maybe<string>) => Maybe<LogStore>;
  readonly respond: (response: LogWorkerResponse) => void;
  readonly close: () => void;
  readonly maximumBatchBytes: number;
};

type LogWorkerProcessor = {
  readonly receive: (message: unknown) => Promise<void>;
};

function isWorkerAcceptingCommands(workerIsBusy: boolean, workerIsStopped: boolean): boolean {
  return !workerIsBusy && !workerIsStopped;
}

function shouldStopAfterRejectedBinding(command: LogWorkerCommand, workerIsStopped: boolean): boolean {
  return command.type === 'bind-account' && !workerIsStopped;
}

export function createLogWorkerProcessor(options: LogWorkerProcessorOptions): LogWorkerProcessor {
  const {initialize, respond, close, maximumBatchBytes} = options;
  let store: Maybe<LogStore> = Maybe.nothing();
  let accountIdentifier: Maybe<string> = Maybe.nothing();
  let busy = false;
  let stopped = false;

  function respondSafely(response: LogWorkerResponse): void {
    try {
      respond(response);
    } catch {
      stopped = true;
    }
  }

  function closeSafely(): void {
    stopped = true;
    try {
      close();
    } catch {
      // A worker close failure cannot affect application code.
    }
  }

  async function receive(message: unknown): Promise<void> {
    const request = parseLogWorkerRequest(message, maximumBatchBytes);
    if (request.isNothing) {
      respondSafely({requestIdentifier: 0, outcome: 'failed'});
      if (isLogWorkerAccountBindingAttempt(message)) {
        closeSafely();
      }

      return;
    }

    const command = request.value;
    const {requestIdentifier} = command;
    if (!isWorkerAcceptingCommands(busy, stopped)) {
      respondSafely({requestIdentifier, outcome: 'failed'});
      if (shouldStopAfterRejectedBinding(command, stopped)) {
        closeSafely();
      }

      return;
    }

    busy = true;
    try {
      if (command.type === 'shutdown') {
        if (store.isJust) {
          await store.value.append([]);
        }

        respondSafely({requestIdentifier, outcome: 'complete'});
        closeSafely();

        return;
      }

      if (command.type === 'bind-account') {
        if (accountIdentifier.unwrapOr('') !== command.accountIdentifier) {
          accountIdentifier = Maybe.just(command.accountIdentifier);
          // Batches release their handles, so switching stores preserves earlier unattributed files.
          store = Maybe.nothing();
        }
      }

      if (store.isNothing) {
        store = initialize(accountIdentifier);
      }

      if (store.isNothing) {
        respondSafely({requestIdentifier, outcome: 'unsupported'});
        closeSafely();

        return;
      }

      await store.value.append(command.type === 'append' ? command.lines : []);
      respondSafely({requestIdentifier, outcome: 'complete'});
    } catch {
      respondSafely({requestIdentifier, outcome: 'failed'});
      if (command.type === 'bind-account') {
        closeSafely();
      }
    } finally {
      busy = false;
    }
  }

  return {receive};
}
