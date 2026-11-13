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

import {noop} from 'noop-esm';
import {Maybe} from 'true-myth';

import type {LogWorkerConnection} from '../createLogWorkerClient';
import type {LogWorkerRequest} from '../logWorkerProtocol';

export function createLogWorkerConnectionForTest(): {
  readonly connection: LogWorkerConnection;
  readonly requests: LogWorkerRequest[];
  readonly state: {terminated: boolean; failPosting: boolean; onPost: (request: LogWorkerRequest) => void};
  readonly emitMessage: (message: unknown) => void;
  readonly fail: () => void;
} {
  type Listeners = Parameters<LogWorkerConnection['subscribe']>[0];
  let listeners: Maybe<Listeners> = Maybe.nothing();
  const requests: LogWorkerRequest[] = [];
  const state: {terminated: boolean; failPosting: boolean; onPost: (request: LogWorkerRequest) => void} = {
    terminated: false,
    failPosting: false,
    onPost: noop,
  };
  const connection: LogWorkerConnection = {
    postMessage(request) {
      if (state.failPosting) {
        throw new Error('Cannot post message');
      }

      requests.push(request);
      state.onPost(request);
    },
    subscribe(subscriptions) {
      listeners = Maybe.just(subscriptions);

      return function unsubscribe() {
        listeners = Maybe.nothing();
      };
    },
    terminate() {
      state.terminated = true;
    },
  };

  function emitMessage(message: unknown): void {
    if (listeners.isJust) {
      listeners.value.onMessage(message);
    }
  }

  function fail(): void {
    if (listeners.isJust) {
      listeners.value.onFailure();
    }
  }

  return {connection, requests, state, emitMessage, fail};
}
