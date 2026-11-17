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
import {createFireAndForgetInvoker} from '@enormora/fire-and-forget';
import {noop} from 'noop-esm';
import {Maybe, Result, task, Unit} from 'true-myth';

import {createBrowserLogPersistence, type BrowserLogPersistence} from './createBrowserLogPersistence';
import {createAccountLogCleanup} from './createAccountLogCleanup';
import {createAuthenticatedAccountBinding} from './createAuthenticatedAccountBinding';
import type {LogDirectory} from './createOriginPrivateFileSystemLogStore';
import {createLogWorkerConnectionForTest} from './test/createLogWorkerConnectionForTest';
import {logDirectoryFactory, qualifiedAccountIdentityFactory} from './test/logDeletionTestFactories';
import type {LogWorkerRequest} from './logWorkerProtocol';
import {logPersistenceConfiguration} from './logPersistenceConfiguration';

type BrowserLogPersistenceTestFixture = {
  readonly output: BrowserLogPersistence;
  readonly worker: ReturnType<typeof createLogWorkerConnectionForTest>;
  readonly clock: ReturnType<typeof createDeterministicClock>;
  readonly hide: () => void;
};

function createTestPersistence(): BrowserLogPersistenceTestFixture {
  const worker = createLogWorkerConnectionForTest();
  const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
  let visibilityListener = noop;
  worker.state.onPost = request => {
    worker.emitMessage({requestIdentifier: request.requestIdentifier, outcome: 'complete'});
  };
  const output = createBrowserLogPersistence({
    clock,
    createWorker() {
      return Maybe.just(worker.connection);
    },
    lifecycle: {
      isHidden() {
        return true;
      },
      subscribeToVisibilityChanges(listener) {
        visibilityListener = listener;

        return noop;
      },
    },
  }).unwrapOrElse(() => {
    throw new Error('Expected persistence worker');
  });

  return {
    output,
    worker,
    clock,
    hide() {
      visibilityListener();
    },
  };
}

describe('browser log persistence composition', () => {
  it.each(['append', 'bind-account'] as const)(
    'cannot recreate deleted files after a pending %s completes',
    async pendingCommand => {
      const {output, worker, clock} = createTestPersistence();
      await output.flush();
      const accountIdentifier = 'a'.repeat(64);
      const filename = `log-1-${'b'.repeat(36)}-1-${accountIdentifier}.jsonl`;
      const files = new Set<string>();
      const pendingRequest = Promise.withResolvers<LogWorkerRequest>();
      worker.state.onPost = request => {
        if (request.type === pendingCommand) {
          pendingRequest.resolve(request);
        } else {
          worker.emitMessage({requestIdentifier: request.requestIdentifier, outcome: 'complete'});
        }
      };
      if (pendingCommand === 'append') {
        output.write('{"pending":true}', 'info');
      }
      const transition = pendingCommand === 'bind-account' ? output.bindAccount(accountIdentifier) : output.flush();
      const request = await pendingRequest.promise;
      expect(request.type).toBe(pendingCommand);
      if (pendingCommand === 'append') {
        output.write('{"buffered":true}', 'info');
      }
      const removeEntry = jest.fn(async (name: string): Promise<void> => {
        expect(worker.state.terminated).toBe(true);
        files.delete(name);
      });
      const directory: LogDirectory = logDirectoryFactory.build({
        async getDirectoryHandle() {
          return directory;
        },
        async *values() {
          for (const name of files) {
            yield {name, kind: 'file' as const};
          }
        },
        removeEntry,
      });
      const getDirectory = jest.fn(async () => {
        return directory;
      });
      const cleanup = createAccountLogCleanup({
        isElectron: false,
        persistence: Maybe.just(output),
        async hashQualifiedId() {
          return accountIdentifier;
        },
        getDirectory,
        reportFailure() {
          throw new Error('Unexpected cleanup failure');
        },
      });
      const deleting = cleanup(Maybe.just(qualifiedAccountIdentityFactory.build()));
      output.write('{"afterCleanupStarted":true}', 'info');
      expect(output.getStatistics().droppedRecords).toBe(1);
      expect(getDirectory).not.toHaveBeenCalled();
      worker.state.onPost = nextRequest => {
        if (nextRequest.type === 'bind-account') {
          files.add(filename);
        }
        worker.emitMessage({requestIdentifier: nextRequest.requestIdentifier, outcome: 'complete'});
      };
      // Simulate the delayed write committing before its acknowledgement.
      files.add(filename);
      worker.emitMessage({requestIdentifier: request.requestIdentifier, outcome: 'complete'});
      await transition;
      await deleting;
      expect(files.size).toBe(0);
      expect(removeEntry).toHaveBeenCalledWith(filename);
      const requestCount = worker.requests.length;
      output.write('{"afterDeletion":true}', 'info');
      clock.advanceByMilliseconds(60_000);
      await output.flush();
      expect((await output.bindAccount(accountIdentifier)).isErr).toBe(true);
      expect(worker.requests).toHaveLength(requestCount);
      expect(worker.state.terminated).toBe(true);
    },
  );

  it('rejects a delayed authenticated binding after cleanup has terminated the worker', async () => {
    const {output, worker} = createTestPersistence();
    const hashing = Promise.withResolvers<string>();
    const reportFailure = jest.fn();
    const notifyAccount = createAuthenticatedAccountBinding({
      persistence: Maybe.just(output),
      fireAndForgetInvoker: createFireAndForgetInvoker({reportError: noop}),
      onAccountBound: noop,
      hashQualifiedId() {
        return hashing.promise;
      },
      reportFailure,
    });
    const authenticating = notifyAccount(qualifiedAccountIdentityFactory.build());
    const cleanup = createAccountLogCleanup({
      isElectron: false,
      persistence: Maybe.just(output),
      async hashQualifiedId() {
        return 'a'.repeat(64);
      },
      async getDirectory(): Promise<never> {
        throw {name: 'NotFoundError'};
      },
      reportFailure,
    });
    await cleanup(Maybe.just(qualifiedAccountIdentityFactory.build()));
    const requestCount = worker.requests.length;
    hashing.resolve('a'.repeat(64));
    await authenticating;
    await output.flush();
    expect(worker.state.terminated).toBe(true);
    expect(worker.requests).toHaveLength(requestCount);
    expect(
      worker.requests.some(request => {
        return request.type === 'bind-account';
      }),
    ).toBe(false);
  });

  it('binds before initial writes, shares repeated binding and skips an already bound account', async () => {
    const {output, worker} = createTestPersistence();
    await using persistence = output;
    const bindingRequest = Promise.withResolvers<LogWorkerRequest>();
    worker.state.onPost = request => {
      bindingRequest.resolve(request);
    };
    const accountIdentifier = 'a'.repeat(64);
    const binding = output.bindAccount(accountIdentifier);
    const writingAfterBinding = binding.inspect(() => {
      output.write('{"after":true}', 'info');
    });
    const request = await bindingRequest.promise;
    try {
      expect(output.bindAccount(accountIdentifier)).toBe(binding);
      expect((await output.bindAccount('b'.repeat(64))).isErr).toBe(true);
      output.write('{"during":true}', 'info');
      expect(request.type).toBe('bind-account');
    } finally {
      worker.state.onPost = nextRequest => {
        worker.emitMessage({requestIdentifier: nextRequest.requestIdentifier, outcome: 'complete'});
      };
      worker.emitMessage({requestIdentifier: request.requestIdentifier, outcome: 'complete'});
    }
    expect(await binding).toEqual(Result.ok(Unit));
    expect(await writingAfterBinding).toEqual(Result.ok(Unit));
    const requestCount = worker.requests.length;
    expect(await output.bindAccount(accountIdentifier)).toEqual(Result.ok(Unit));
    expect(worker.requests).toHaveLength(requestCount);
    await output.flush();

    expect(worker.requests).toEqual([
      {type: 'initialize', requestIdentifier: 1},
      {type: 'bind-account', requestIdentifier: 2, accountIdentifier},
      {type: 'append', requestIdentifier: 3, lines: ['{"after":true}\n']},
    ]);
    expect(output.getStatistics().droppedRecords).toBe(1);
  });

  it('drains buffered records under their earlier ownership before each account switch', async () => {
    const {output, worker} = createTestPersistence();
    await using persistence = output;
    await output.flush();
    output.write('{"unattributed":true}', 'info');
    expect((await output.bindAccount('a'.repeat(64))).isOk).toBe(true);
    output.write('{"firstAccount":true}', 'info');
    expect((await output.bindAccount('b'.repeat(64))).isOk).toBe(true);
    output.write('{"secondAccount":true}', 'info');
    await output.flush();

    expect(
      worker.requests.map(request => {
        return request.type;
      }),
    ).toEqual(['initialize', 'append', 'bind-account', 'append', 'bind-account', 'append']);
    expect(
      worker.requests
        .filter(request => {
          return request.type === 'append';
        })
        .map(request => {
          return request.lines;
        }),
    ).toEqual([['{"unattributed":true}\n'], ['{"firstAccount":true}\n'], ['{"secondAccount":true}\n']]);
  });

  it('waits for an automatic in-flight append and drains earlier pending records before binding', async () => {
    const {output, worker, clock, hide} = createTestPersistence();
    await using persistence = output;
    await output.flush();
    const appendRequest = Promise.withResolvers<LogWorkerRequest>();
    worker.state.onPost = request => {
      appendRequest.resolve(request);
    };
    output.write('{"inFlight":true}', 'info');
    clock.advanceByMilliseconds(logPersistenceConfiguration.flushIntervalMilliseconds);
    const request = await appendRequest.promise;
    output.write('{"pending":true}', 'info');
    const binding = output.bindAccount('a'.repeat(64));
    const flushing = output.flush();
    try {
      hide();
      output.write('{"during":true}', 'info');
      clock.advanceByMilliseconds(logPersistenceConfiguration.flushIntervalMilliseconds);
      expect(worker.requests.at(-1)).toEqual(request);
    } finally {
      worker.state.onPost = nextRequest => {
        worker.emitMessage({requestIdentifier: nextRequest.requestIdentifier, outcome: 'complete'});
      };
      worker.emitMessage({requestIdentifier: request.requestIdentifier, outcome: 'complete'});
    }
    expect((await binding).isOk).toBe(true);
    await flushing;

    expect(
      worker.requests.map(sentRequest => {
        return sentRequest.type;
      }),
    ).toEqual(['initialize', 'append', 'append', 'bind-account']);
    expect(worker.requests.at(-2)).toMatchObject({lines: ['{"pending":true}\n']});
    expect(output.getStatistics()).toMatchObject({pendingBytes: 0, droppedRecords: 1, suspended: false});
  });

  it.each(['append', 'bind-account'] as const)(
    'keeps the barrier closed after %s failure, including explicit and lifecycle flushes',
    async failedCommand => {
      const {output, worker, clock, hide} = createTestPersistence();
      await using persistence = output;
      await output.bindAccount('a'.repeat(64));
      output.write('{"earlier":true}', 'info');
      worker.state.onPost = request => {
        worker.emitMessage({
          requestIdentifier: request.requestIdentifier,
          outcome: request.type === failedCommand ? 'failed' : 'complete',
        });
      };
      const observedBindingFailures: string[] = [];
      const result = await output.bindAccount('b'.repeat(64)).inspectRejected(failure => {
        observedBindingFailures.push(failure);
      });
      expect(result).toEqual(Result.err(failedCommand === 'append' ? 'drain-failed' : 'operation-failed'));
      expect(observedBindingFailures).toEqual([failedCommand === 'append' ? 'drain-failed' : 'operation-failed']);
      const requestCount = worker.requests.length;
      output.write('{"afterFailure":true}', 'info');
      await output.flush();
      hide();
      clock.advanceByMilliseconds(60_000);
      await output.flush();
      expect(worker.requests).toHaveLength(requestCount);
      expect(output.getStatistics()).toMatchObject({
        suspended: true,
        failures: 1,
        droppedRecords: failedCommand === 'append' ? 2 : 1,
      });
      // The earlier successful account must also cross the barrier again after failure.
      expect((await output.bindAccount('a'.repeat(64))).isOk).toBe(failedCommand === 'append');
      expect(worker.requests.at(-1)).toMatchObject({type: 'bind-account', accountIdentifier: 'a'.repeat(64)});
    },
  );

  it.each(['return', 'throw'] as const)('awaits scoped cleanup after an early %s', async exitMode => {
    const {output, worker} = createTestPersistence();
    await output.flush();
    const shutdownRequest = Promise.withResolvers<LogWorkerRequest>();
    worker.state.onPost = request => {
      if (request.type === 'shutdown') {
        shutdownRequest.resolve(request);
      } else {
        worker.emitMessage({requestIdentifier: request.requestIdentifier, outcome: 'complete'});
      }
    };

    async function writeWithinScope(): Promise<void> {
      await using persistence = output;
      persistence.write('{"beforeScopeExit":true}', 'info');
      if (exitMode === 'throw') {
        throw new Error('Scope failed');
      }

      return;
    }

    const completion = task.fromPromise(writeWithinScope());
    const request = await shutdownRequest.promise;
    try {
      expect(worker.requests.at(-2)).toMatchObject({type: 'append', lines: ['{"beforeScopeExit":true}\n']});
      expect(worker.state.terminated).toBe(false);
      expect(completion.isPending).toBe(true);
    } finally {
      worker.emitMessage({requestIdentifier: request.requestIdentifier, outcome: 'complete'});
    }
    const expectedCompletion = exitMode === 'throw' ? Result.err(new Error('Scope failed')) : Result.ok(undefined);
    expect(await completion).toEqual(expectedCompletion);

    expect(worker.state.terminated).toBe(true);
    expect((await output.bindAccount('a'.repeat(64))).isErr).toBe(true);
  });

  it('keeps persistence closed when binding acknowledgement times out', async () => {
    const {output, worker, clock} = createTestPersistence();
    await output.bindAccount('a'.repeat(64));
    const bindingRequest = Promise.withResolvers<void>();
    worker.state.onPost = request => {
      if (request.type === 'bind-account') {
        bindingRequest.resolve();
      } else {
        worker.emitMessage({requestIdentifier: request.requestIdentifier, outcome: 'complete'});
      }
    };
    const binding = output.bindAccount('b'.repeat(64));
    await bindingRequest.promise;
    clock.advanceByMilliseconds(logPersistenceConfiguration.workerResponseTimeoutMilliseconds);
    expect(await binding).toEqual(Result.err('operation-failed'));
    const requestCount = worker.requests.length;
    output.write('{"afterTimeout":true}', 'info');
    await output.flush();
    await output.dispose();

    expect(worker.requests).toHaveLength(requestCount);
    expect(worker.state.terminated).toBe(true);
    expect(output.getStatistics()).toMatchObject({suspended: true, droppedRecords: 1});
  });

  it('waits for binding before shutdown and rejects binding after disposal', async () => {
    const {output, worker} = createTestPersistence();
    await output.flush();
    const bindingRequest = Promise.withResolvers<LogWorkerRequest>();
    worker.state.onPost = request => {
      bindingRequest.resolve(request);
    };
    const binding = output.bindAccount('a'.repeat(64));
    const request = await bindingRequest.promise;
    const disposing = output.dispose();
    try {
      expect(worker.requests.at(-1)).toEqual(request);
    } finally {
      worker.state.onPost = nextRequest => {
        worker.emitMessage({requestIdentifier: nextRequest.requestIdentifier, outcome: 'complete'});
      };
      worker.emitMessage({requestIdentifier: request.requestIdentifier, outcome: 'complete'});
    }
    await binding;
    await disposing;

    expect(worker.requests.at(-1)?.type).toBe('shutdown');
    expect((await output.bindAccount('a'.repeat(64))).isErr).toBe(true);
    expect(worker.state.terminated).toBe(true);
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
