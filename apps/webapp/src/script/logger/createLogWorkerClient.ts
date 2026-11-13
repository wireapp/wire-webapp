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

import type {Clock, TimeoutIdentifier} from '@enormora/clock/clock';
import {Maybe} from 'true-myth';
import {match} from 'ts-pattern';

import {parseLogWorkerResponse, type LogWorkerCommand, type LogWorkerRequest} from './logWorkerProtocol';

export type LogWorkerConnection = {
  readonly postMessage: (request: LogWorkerRequest) => void;
  readonly subscribe: (options: {
    readonly onMessage: (message: unknown) => void;
    readonly onFailure: () => void;
  }) => () => void;
  readonly terminate: () => void;
};

type LogWorkerClientOptions = {
  readonly connection: LogWorkerConnection;
  readonly clock: Pick<Clock, 'setTimeout' | 'clearTimeout'>;
  readonly responseTimeoutMilliseconds: number;
};

type PendingWorkerRequest = {
  readonly requestIdentifier: number;
  readonly timeout: TimeoutIdentifier;
  readonly resolve: () => void;
  readonly reject: (error: Error) => void;
};

type LogWorkerClient = {
  readonly append: (lines: readonly string[]) => Promise<void>;
  readonly shutdown: () => Promise<void>;
};

export function createLogWorkerClient(options: LogWorkerClientOptions): LogWorkerClient {
  const {connection, clock, responseTimeoutMilliseconds} = options;
  // One acknowledged command at a time keeps the browser's message queue bounded too.
  let pending: Maybe<PendingWorkerRequest> = Maybe.nothing();
  let nextRequestIdentifier = 0;
  let initialized = false;
  let unavailable = false;

  function failConnection(): void {
    unavailable = true;
    stopListening();
    connection.terminate();
    if (pending.isJust) {
      const request = pending.value;
      pending = Maybe.nothing();
      clock.clearTimeout(request.timeout);
      request.reject(new Error('Log persistence worker unavailable'));
    }
  }

  function onMessage(message: unknown): void {
    const response = parseLogWorkerResponse(message);
    if (!isExpectedResponse(response)) {
      failConnection();

      return;
    }

    if (pending.isNothing || response.isNothing) {
      return;
    }

    const request = pending.value;
    pending = Maybe.nothing();
    clock.clearTimeout(request.timeout);
    match(response.value.outcome)
      .with('complete', () => {
        request.resolve();
      })
      .with('failed', 'unsupported', outcome => {
        if (outcome === 'unsupported') {
          unavailable = true;
          stopListening();
          connection.terminate();
        }

        request.reject(new Error('Log persistence worker rejected the operation'));
      })
      .exhaustive();
  }

  function isExpectedResponse(response: ReturnType<typeof parseLogWorkerResponse>): boolean {
    return response.isJust && pending.isJust && response.value.requestIdentifier === pending.value.requestIdentifier;
  }

  const stopListening = connection.subscribe({onMessage, onFailure: failConnection});

  function request(command: LogWorkerCommand): Promise<void> {
    if (unavailable || pending.isJust) {
      return Promise.reject(new Error('Log persistence worker is not accepting commands'));
    }

    nextRequestIdentifier += 1;
    const requestIdentifier = nextRequestIdentifier;

    return new Promise<void>((resolve, reject) => {
      const timeout = clock.setTimeout(failConnection, responseTimeoutMilliseconds);
      pending = Maybe.just({requestIdentifier, timeout, resolve, reject});
      try {
        connection.postMessage({...command, requestIdentifier});
      } catch {
        failConnection();
      }
    });
  }

  async function append(lines: readonly string[]): Promise<void> {
    const wasInitialized = initialized;
    if (!initialized) {
      await request({type: 'initialize'});
      initialized = true;
    }

    if (lines.length > 0) {
      await request({type: 'append', lines});
    } else if (wasInitialized) {
      await request({type: 'flush'});
    }
  }

  async function shutdown(): Promise<void> {
    try {
      if (!unavailable) {
        await request({type: 'shutdown'});
      }
    } finally {
      unavailable = true;
      stopListening();
      connection.terminate();
    }
  }

  return {append, shutdown};
}
