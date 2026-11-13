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

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {Maybe} from 'true-myth';

import {createBrowserLogPersistence} from './createBrowserLogPersistence';
import {createLogWorkerConnectionForTest} from './test/createLogWorkerConnectionForTest';

describe('browser log persistence composition', () => {
  it('flushes pre-authentication records before binding and drops records during the ownership transition', async () => {
    const worker = createLogWorkerConnectionForTest();
    worker.state.onPost = function respond(request): void {
      worker.emitMessage({requestIdentifier: request.requestIdentifier, outcome: 'complete'});
    };
    const persistence = createBrowserLogPersistence({
      clock: createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
      createWorker() {
        return Maybe.just(worker.connection);
      },
      lifecycle: {
        isHidden() {
          return false;
        },
        subscribeToVisibilityChanges() {
          return function unsubscribe(): void {};
        },
      },
    }).unwrapOrElse(() => {
      throw new Error('Expected persistence');
    });
    await persistence.flush();
    persistence.write('{"preAuthentication":true}', 'info');
    const accountIdentity = Promise.withResolvers<string>();
    const transition = persistence.setAccount(() => {
      return accountIdentity.promise;
    });
    persistence.write('{"duringTransition":true}', 'info');
    accountIdentity.resolve('a'.repeat(64));
    await transition;
    persistence.write('{"authenticated":true}', 'info');
    await persistence.flush();

    const relevantRequests = worker.requests.filter(request => {
      return request.type === 'append' || request.type === 'set-account';
    });
    expect(
      relevantRequests.map(request => {
        if (request.type === 'append') {
          return request.lines;
        }
        if (request.type === 'set-account') {
          return request.accountIdentifier;
        }

        throw new Error('Unexpected ownership request');
      }),
    ).toEqual([['{"preAuthentication":true}\n'], 'a'.repeat(64), ['{"authenticated":true}\n']]);
    expect(persistence.getStatistics().droppedRecords).toBe(1);
    await persistence.dispose();
  });

  it('stops accepting records when account binding fails instead of persisting them as unattributed', async () => {
    const worker = createLogWorkerConnectionForTest();
    worker.state.onPost = function respond(request): void {
      worker.emitMessage({
        requestIdentifier: request.requestIdentifier,
        outcome: request.type === 'set-account' ? 'failed' : 'complete',
      });
    };
    const persistence = createBrowserLogPersistence({
      clock: createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
      createWorker() {
        return Maybe.just(worker.connection);
      },
      lifecycle: {
        isHidden() {
          return false;
        },
        subscribeToVisibilityChanges() {
          return function unsubscribe(): void {};
        },
      },
    }).unwrapOrElse(() => {
      throw new Error('Expected persistence');
    });

    await expect(
      persistence.setAccount(async () => {
        return 'a'.repeat(64);
      }),
    ).rejects.toThrow();
    persistence.write('{"private":true}', 'info');
    await persistence.flush();

    expect(
      worker.requests.some(request => {
        return request.type === 'append';
      }),
    ).toBe(false);
    expect(persistence.getStatistics().droppedRecords).toBe(1);
    await persistence.dispose();
  });

  it('returns Nothing without starting a queue if worker construction is unavailable', () => {
    const createWorker = jest.fn((): Maybe<never> => {
      return Maybe.nothing();
    });
    const output = createBrowserLogPersistence({
      clock: createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
      createWorker,
      lifecycle: {
        isHidden(): never {
          throw new Error('Unavailable workers must not observe lifecycle state');
        },
        subscribeToVisibilityChanges(): never {
          throw new Error('Unavailable workers must not subscribe to lifecycle changes');
        },
      },
    });

    expect(output).toEqual(Maybe.nothing());
    expect(createWorker).toHaveBeenCalledTimes(1);
  });

  it('initializes asynchronously, flushes on hidden visibility, and shuts down when disposed', async () => {
    const worker = createLogWorkerConnectionForTest();
    worker.state.onPost = function respond(request) {
      worker.emitMessage({requestIdentifier: request.requestIdentifier, outcome: 'complete'});
    };
    const visibilityListeners = new Set<() => void>();
    let hidden = false;
    const lifecycle = {
      isHidden() {
        return hidden;
      },
      subscribeToVisibilityChanges(listener: () => void) {
        visibilityListeners.add(listener);

        return function unsubscribe() {
          visibilityListeners.delete(listener);
        };
      },
    };
    const output = createBrowserLogPersistence({
      clock: createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
      createWorker() {
        return Maybe.just(worker.connection);
      },
      lifecycle,
    }).unwrapOrElse(() => {
      throw new Error('Expected persistence worker');
    });
    expect(worker.requests).toEqual([{type: 'initialize', requestIdentifier: 1}]);
    await output.flush();
    const initializedRequestCount = worker.requests.length;
    visibilityListeners.forEach(listener => {
      listener();
    });
    expect(worker.requests).toHaveLength(initializedRequestCount);
    hidden = true;
    visibilityListeners.forEach(listener => {
      listener();
    });
    await output.flush();
    expect(worker.requests.at(-1)?.type).toBe('flush');
    output.write('{}', 'info');
    await output.dispose();
    const completedRequestCount = worker.requests.length;
    visibilityListeners.forEach(listener => {
      listener();
    });

    expect(worker.requests).toHaveLength(completedRequestCount);
    expect(worker.requests.at(-1)?.type).toBe('shutdown');
    expect(worker.state.terminated).toBe(true);
  });
});
