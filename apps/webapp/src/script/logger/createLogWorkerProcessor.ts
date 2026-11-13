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
import {parseLogWorkerRequest, type LogWorkerResponse} from './logWorkerProtocol';

type LogWorkerProcessorOptions = {
  readonly initialize: (accountIdentifier?: string) => Maybe<LogStore> | Promise<Maybe<LogStore>>;
  readonly removeAccountLogs?: (accountIdentifier: string) => Promise<void>;
  readonly respond: (response: LogWorkerResponse) => void;
  readonly close: () => void;
  readonly maximumBatchBytes: number;
};

type LogWorkerProcessor = {
  readonly receive: (message: unknown) => Promise<void>;
};

export function createLogWorkerProcessor(options: LogWorkerProcessorOptions): LogWorkerProcessor {
  const {initialize, respond, close, maximumBatchBytes} = options;
  let store: Maybe<LogStore> = Maybe.nothing();
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

      return;
    }

    const {requestIdentifier} = request.value;
    if (busy || stopped) {
      respondSafely({requestIdentifier, outcome: 'failed'});

      return;
    }

    busy = true;
    try {
      await match(request.value)
        .with({type: 'set-account'}, async command => {
          store = Maybe.nothing();
          store = await initialize(command.accountIdentifier);
          if (store.isNothing) {
            respondSafely({requestIdentifier, outcome: 'unsupported'});
            closeSafely();

            return;
          }

          await store.value.append([]);
          respondSafely({requestIdentifier, outcome: 'complete'});
        })
        .with({type: 'remove-account'}, async command => {
          if (options.removeAccountLogs === undefined) {
            throw new Error('Account log removal unsupported');
          }

          await options.removeAccountLogs(command.accountIdentifier);
          respondSafely({requestIdentifier, outcome: 'complete'});
        })
        .with({type: 'shutdown'}, async () => {
          if (store.isJust) {
            await store.value.append([]);
          }

          respondSafely({requestIdentifier, outcome: 'complete'});
          closeSafely();
        })
        .with({type: P.union('initialize', 'append', 'flush')}, async command => {
          if (store.isNothing) {
            store = await initialize();
          }

          if (store.isNothing) {
            respondSafely({requestIdentifier, outcome: 'unsupported'});
            closeSafely();

            return;
          }

          await store.value.append(command.type === 'append' ? command.lines : []);
          respondSafely({requestIdentifier, outcome: 'complete'});
        })
        .exhaustive();
    } catch {
      respondSafely({requestIdentifier, outcome: 'failed'});
      if (request.value.type === 'set-account') {
        // Failed ownership changes must never fall back to unattributed logging.
        closeSafely();
      }
    } finally {
      busy = false;
    }
  }

  return {receive};
}
