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
