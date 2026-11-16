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
import {match, P} from 'ts-pattern';

import type {LogStore} from './createOriginPrivateFileSystemLogStore';
import {parseLogWorkerRequest, type LogWorkerCommand, type LogWorkerResponse} from './logWorkerProtocol';

type LogWorkerProcessorOptions = {
  readonly initialize: (accountIdentifier: Maybe<string>) => Maybe<LogStore>;
  readonly respond: (response: LogWorkerResponse) => void;
  readonly close: () => void;
  readonly maximumBatchBytes: number;
};

type LogWorkerProcessor = {
  readonly receive: (message: unknown) => Promise<void>;
};

type LogWorkerStorageState = {
  readonly accountIdentifier: Maybe<string>;
  readonly store: Maybe<LogStore>;
};

type LogWorkerCommandPlan =
  | {readonly type: 'shutdown'}
  | {
      readonly type: 'persist';
      readonly storage: LogWorkerStorageState;
      readonly lines: readonly string[];
    };

function isWorkerAcceptingCommands(workerIsBusy: boolean, workerIsStopped: boolean): boolean {
  return !workerIsBusy && !workerIsStopped;
}

function shouldStopAfterRejectedBinding(command: LogWorkerCommand, workerIsStopped: boolean): boolean {
  return command.type === 'bind-account' && !workerIsStopped;
}

function planLogWorkerCommand(command: LogWorkerCommand, storage: LogWorkerStorageState): LogWorkerCommandPlan {
  return match(command)
    .returnType<LogWorkerCommandPlan>()
    .with({type: 'shutdown'}, () => {
      return {type: 'shutdown'};
    })
    .with({type: 'bind-account'}, bindingCommand => {
      const isSameAccount = storage.accountIdentifier.unwrapOr('') === bindingCommand.accountIdentifier;

      return {
        type: 'persist',
        storage: {
          accountIdentifier: Maybe.just(bindingCommand.accountIdentifier),
          // Batches release their handles, so switching stores preserves earlier unattributed files.
          store: isSameAccount ? storage.store : Maybe.nothing(),
        },
        lines: [],
      };
    })
    .with({type: 'append'}, appendCommand => {
      return {type: 'persist', storage, lines: appendCommand.lines};
    })
    .with({type: P.union('initialize', 'flush')}, () => {
      return {type: 'persist', storage, lines: []};
    })
    .exhaustive();
}

export function createLogWorkerProcessor(options: LogWorkerProcessorOptions): LogWorkerProcessor {
  const {initialize, respond, close, maximumBatchBytes} = options;
  let storage: LogWorkerStorageState = {accountIdentifier: Maybe.nothing(), store: Maybe.nothing()};
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
      closeSafely();

      return;
    }

    const {requestIdentifier} = request.value;
    if (!isWorkerAcceptingCommands(busy, stopped)) {
      respondSafely({requestIdentifier, outcome: 'failed'});
      if (shouldStopAfterRejectedBinding(request.value, stopped)) {
        closeSafely();
      }

      return;
    }

    busy = true;
    try {
      const plan = planLogWorkerCommand(request.value, storage);
      if (plan.type === 'shutdown') {
        if (storage.store.isJust) {
          await storage.store.value.append([]);
        }

        respondSafely({requestIdentifier, outcome: 'complete'});
        closeSafely();

        return;
      }

      storage = plan.storage;
      if (storage.store.isNothing) {
        storage = {...storage, store: initialize(storage.accountIdentifier)};
      }

      if (storage.store.isNothing) {
        respondSafely({requestIdentifier, outcome: 'unsupported'});
        closeSafely();

        return;
      }

      await storage.store.value.append(plan.lines);
      respondSafely({requestIdentifier, outcome: 'complete'});
    } catch {
      respondSafely({requestIdentifier, outcome: 'failed'});
      if (request.value.type === 'bind-account') {
        closeSafely();
      }
    } finally {
      busy = false;
    }
  }

  return {receive};
}
