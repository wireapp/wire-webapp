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
import {createFireAndForgetInvoker, type FireAndForgetInvoker} from '@enormora/fire-and-forget';
import {asyncNoop, noop} from 'noop-esm';
import {Maybe, task} from 'true-myth';

import {createAuthenticatedAccountBinding} from './createAuthenticatedAccountBinding';
import {createBrowserLogPersistence, type BrowserLogPersistence} from './createBrowserLogPersistence';
import {createLogWorkerProcessor} from './createLogWorkerProcessor';
import {createPinoLogging} from './createPinoLogging';
import {logPersistenceConfiguration} from './logPersistenceConfiguration';
import {logRuntimeIdentity} from './logRuntimeIdentity';
import {createLogWorkerConnectionForTest} from './test/createLogWorkerConnectionForTest';

import {loadAuthenticatedSelfUser} from '../main/loadAuthenticatedSelfUser';

const qualifiedId = {domain: 'example.com', id: 'self-user'};
const accountIdentifier = 'a'.repeat(64);

function createPersistenceFixture(): {
  readonly fireAndForgetInvoker: FireAndForgetInvoker;
  readonly persistence: BrowserLogPersistence;
  readonly worker: ReturnType<typeof createLogWorkerConnectionForTest>;
} {
  const worker = createLogWorkerConnectionForTest();
  worker.state.onPost = request => {
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
        return noop;
      },
    },
  }).unwrapOrElse(() => {
    throw new Error('Expected persistence');
  });

  return {persistence, worker, fireAndForgetInvoker: createFireAndForgetInvoker({reportError: noop})};
}

describe('authenticated account log binding', () => {
  it('persists runtime identity at startup and again only after the account write barrier reopens', async () => {
    const {persistence, worker, fireAndForgetInvoker} = createPersistenceFixture();
    await using cleanup = persistence;
    const logging = createPinoLogging(
      Maybe.just({
        clock: createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
        output: noop,
        namespaces: Maybe.nothing<string>(),
        persistenceOutput: Maybe.just(persistence.write),
      }),
    );
    const runtimeIdentity = {
      logger: logging.getLogger('RuntimeIdentity'),
      deploymentStage: 'beta',
      origin: 'https://wire-webapp-beta.wire.com',
      version: '1.2.3',
      assetVersion: '1.2.3-abcdef',
    };
    logRuntimeIdentity(runtimeIdentity);
    await persistence.flush();
    const startupAppend = worker.requests.at(-1);
    if (startupAppend?.type !== 'append') {
      throw new Error('Expected startup identity to be persisted');
    }
    expect(startupAppend).toMatchObject({type: 'append', lines: [expect.stringContaining('WebApp runtime identity')]});

    const bindingPosted = Promise.withResolvers<void>();
    worker.state.onPost = request => {
      if (request.type === 'bind-account') {
        bindingPosted.resolve();
      } else {
        worker.emitMessage({requestIdentifier: request.requestIdentifier, outcome: 'complete'});
      }
    };
    const onAccountBound = jest.fn(() => {
      logRuntimeIdentity(runtimeIdentity);
    });
    const onAuthenticatedAccount = createAuthenticatedAccountBinding({
      fireAndForgetInvoker,
      persistence: Maybe.just(persistence),
      async hashQualifiedId(): Promise<string> {
        return accountIdentifier;
      },
      onAccountBound,
      reportFailure: noop,
    });
    try {
      await onAuthenticatedAccount(qualifiedId);
      await bindingPosted.promise;
      expect(persistence.getStatistics()).toMatchObject({suspended: true, droppedRecords: 0});
      expect(onAccountBound).not.toHaveBeenCalled();
      expect(worker.requests.at(-1)).toMatchObject({type: 'bind-account', accountIdentifier});
    } finally {
      worker.state.onPost = request => {
        worker.emitMessage({requestIdentifier: request.requestIdentifier, outcome: 'complete'});
      };
      const request = worker.requests.at(-1);
      if (request?.type === 'bind-account') {
        worker.emitMessage({requestIdentifier: request.requestIdentifier, outcome: 'complete'});
      }
    }
    await fireAndForgetInvoker.waitUntilAllSettled();
    await persistence.flush();

    expect(onAccountBound).toHaveBeenCalledTimes(1);
    expect(persistence.getStatistics()).toMatchObject({suspended: false, droppedRecords: 0});
    expect(worker.requests.at(-1)).toMatchObject({type: 'append', lines: startupAppend.lines});
  });

  it('does nothing when persistence is disabled or unsupported, including no crypto access', async () => {
    const fireAndForgetInvoker = createFireAndForgetInvoker({reportError: noop});
    const hashQualifiedId = jest.fn();
    const reportFailure = jest.fn();
    const onAccountBound = jest.fn();
    const notify = createAuthenticatedAccountBinding({
      fireAndForgetInvoker,
      onAccountBound,
      persistence: Maybe.nothing(),
      hashQualifiedId,
      reportFailure,
    });

    await expect(notify(qualifiedId)).resolves.toBeUndefined();
    expect(hashQualifiedId).not.toHaveBeenCalled();
    expect(reportFailure).not.toHaveBeenCalled();
    expect(onAccountBound).not.toHaveBeenCalled();
  });

  it('starts the write barrier after hashing and before startup continues without awaiting acknowledgement', async () => {
    const {persistence, worker, fireAndForgetInvoker} = createPersistenceFixture();
    await using cleanup = persistence;
    await persistence.flush();
    const hashing = Promise.withResolvers<string>();
    const bindingPosted = Promise.withResolvers<void>();
    worker.state.onPost = request => {
      if (request.type === 'bind-account') {
        bindingPosted.resolve();
      } else {
        worker.emitMessage({requestIdentifier: request.requestIdentifier, outcome: 'complete'});
      }
    };
    const hashQualifiedId = jest.fn(() => {
      return hashing.promise;
    });
    const reportFailure = jest.fn();
    const onAuthenticatedAccount = createAuthenticatedAccountBinding({
      fireAndForgetInvoker,
      onAccountBound: noop,
      persistence: Maybe.just(persistence),
      hashQualifiedId,
      reportFailure,
    });
    const loading = loadAuthenticatedSelfUser({
      async getSelf() {
        return {qualifiedId};
      },
      onAuthenticatedAccount,
    });
    try {
      hashing.resolve(accountIdentifier);
      expect(await loading).toEqual({qualifiedId});
      expect(hashQualifiedId).toHaveBeenCalledWith(qualifiedId);
      persistence.write('{"authenticated":true}', 'info');
      expect(persistence.getStatistics()).toMatchObject({suspended: true, droppedRecords: 1});
      await bindingPosted.promise;
      expect(worker.requests.at(-1)).toMatchObject({type: 'bind-account', accountIdentifier});
      expect(reportFailure).not.toHaveBeenCalled();
    } finally {
      worker.state.onPost = request => {
        worker.emitMessage({requestIdentifier: request.requestIdentifier, outcome: 'complete'});
      };
      const request = worker.requests.at(-1);
      if (request?.type === 'bind-account') {
        worker.emitMessage({requestIdentifier: request.requestIdentifier, outcome: 'complete'});
      }
    }
    await persistence.flush();
    await fireAndForgetInvoker.waitUntilAllSettled();
    persistence.write('{"bound":true}', 'info');
    await persistence.flush();
    expect(worker.requests.at(-1)).toMatchObject({type: 'append', lines: ['{"bound":true}\n']});
  });

  it('keeps flushed and buffered hashing-window records unattributed before binding the account store', async () => {
    const worker = createLogWorkerConnectionForTest();
    const fireAndForgetInvoker = createFireAndForgetInvoker({reportError: noop});
    const hashing = Promise.withResolvers<string>();
    const hashingStarted = Promise.withResolvers<void>();
    const bindingPosted = Promise.withResolvers<void>();
    const accountStorageReady = Promise.withResolvers<void>();
    const unattributedAppend = jest.fn<Promise<void>, [readonly string[]]>(asyncNoop);
    const accountAppend = jest.fn(async (): Promise<void> => {
      await accountStorageReady.promise;
    });
    const initializedAccounts: Maybe<string>[] = [];
    const processor = createLogWorkerProcessor({
      initialize(account) {
        initializedAccounts.push(account);

        return Maybe.just({append: account.isNothing ? unattributedAppend : accountAppend});
      },
      respond(response) {
        worker.emitMessage(response);
      },
      close: noop,
      maximumBatchBytes: logPersistenceConfiguration.maximumPendingBytes,
    });
    worker.state.onPost = request => {
      fireAndForgetInvoker.fireAndForget(() => {
        return processor.receive(request);
      });
      if (request.type === 'bind-account') {
        bindingPosted.resolve();
      }
    };
    await using persistence = createBrowserLogPersistence({
      clock: createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
      createWorker() {
        return Maybe.just(worker.connection);
      },
      lifecycle: {
        isHidden() {
          return false;
        },
        subscribeToVisibilityChanges() {
          return noop;
        },
      },
    }).unwrapOrElse(() => {
      throw new Error('Expected persistence');
    });
    await persistence.flush();
    persistence.write('{"phase":"startup"}', 'info');
    await persistence.flush();
    const onAuthenticatedAccount = createAuthenticatedAccountBinding({
      fireAndForgetInvoker,
      onAccountBound: noop,
      persistence: Maybe.just(persistence),
      hashQualifiedId() {
        hashingStarted.resolve();

        return hashing.promise;
      },
      reportFailure: noop,
    });
    const loading = loadAuthenticatedSelfUser({
      async getSelf() {
        return {qualifiedId};
      },
      onAuthenticatedAccount,
    });
    try {
      await hashingStarted.promise;
      persistence.write('{"phase":"hashing-flushed"}', 'info');
      await persistence.flush();
      persistence.write('{"phase":"hashing-buffered"}', 'info');
      expect(initializedAccounts).toEqual([Maybe.nothing()]);
      expect(unattributedAppend).toHaveBeenLastCalledWith(['{"phase":"hashing-flushed"}\n']);
      expect(accountAppend).not.toHaveBeenCalled();
      expect(persistence.getStatistics().suspended).toBe(false);

      hashing.resolve(accountIdentifier);
      // Authentication returns while the account store still withholds its binding acknowledgement.
      expect(await loading).toEqual({qualifiedId});
      await bindingPosted.promise;
      persistence.write('{"phase":"binding"}', 'info');
      expect(persistence.getStatistics()).toMatchObject({suspended: true, droppedRecords: 1});
      expect(accountAppend).toHaveBeenCalledWith([]);
    } finally {
      hashing.resolve(accountIdentifier);
      accountStorageReady.resolve();
      await loading;
      await fireAndForgetInvoker.waitUntilAllSettled();
    }
    persistence.write('{"phase":"bound"}', 'info');
    await persistence.flush();

    expect(initializedAccounts).toEqual([Maybe.nothing(), Maybe.just(accountIdentifier)]);
    expect(
      unattributedAppend.mock.calls.flatMap(call => {
        return call[0];
      }),
    ).toEqual(['{"phase":"startup"}\n', '{"phase":"hashing-flushed"}\n', '{"phase":"hashing-buffered"}\n']);
    expect(accountAppend.mock.calls).toEqual([[[]], [['{"phase":"bound"}\n']]]);
    expect(persistence.getStatistics()).toMatchObject({suspended: false, droppedRecords: 1});
  });

  it.each(['unavailable', 'rejected'] as const)(
    'continues login and stops old-account writes when hashing is %s',
    async failure => {
      const {persistence, worker, fireAndForgetInvoker} = createPersistenceFixture();
      await using cleanup = persistence;
      await persistence.bindAccount('b'.repeat(64));
      const reportFailure = jest.fn();
      const onAuthenticatedAccount = createAuthenticatedAccountBinding({
        fireAndForgetInvoker,
        onAccountBound: noop,
        persistence: Maybe.just(persistence),
        hashQualifiedId() {
          if (failure === 'unavailable') {
            throw new Error('Crypto unavailable');
          }

          return Promise.reject(new Error('Hash rejected'));
        },
        reportFailure,
      });

      await expect(
        loadAuthenticatedSelfUser({
          async getSelf() {
            return {qualifiedId};
          },
          onAuthenticatedAccount,
        }),
      ).resolves.toEqual({qualifiedId});
      persistence.write('{"afterFailure":true}', 'info');
      expect(persistence.getStatistics().droppedRecords).toBe(1);
      expect(
        worker.requests.filter(request => {
          return request.type === 'bind-account';
        }),
      ).toHaveLength(1);
      expect(reportFailure).toHaveBeenCalledTimes(1);
      await fireAndForgetInvoker.waitUntilAllSettled();
    },
  );

  it('handles a rejected binding Task, keeps writes closed, and preserves successful login', async () => {
    const {persistence, worker, fireAndForgetInvoker} = createPersistenceFixture();
    const reportFailure = jest.fn();
    const onAccountBound = jest.fn();
    worker.state.onPost = request => {
      worker.emitMessage({
        requestIdentifier: request.requestIdentifier,
        outcome: request.type === 'bind-account' ? 'failed' : 'complete',
      });
    };
    const failed = Promise.withResolvers<void>();
    const onAuthenticatedAccount = createAuthenticatedAccountBinding({
      fireAndForgetInvoker,
      onAccountBound,
      persistence: Maybe.just(persistence),
      async hashQualifiedId() {
        return accountIdentifier;
      },
      reportFailure() {
        reportFailure();
        failed.resolve();
      },
    });

    await expect(
      loadAuthenticatedSelfUser({
        async getSelf() {
          return {qualifiedId};
        },
        onAuthenticatedAccount,
      }),
    ).resolves.toEqual({qualifiedId});
    await failed.promise;
    await fireAndForgetInvoker.waitUntilAllSettled();
    persistence.write('{"afterFailure":true}', 'info');
    await persistence.flush();
    expect(persistence.getStatistics()).toMatchObject({suspended: true, failures: 1, droppedRecords: 1});
    expect(reportFailure).toHaveBeenCalledTimes(1);
    expect(onAccountBound).not.toHaveBeenCalled();
    expect(
      worker.requests.some(request => {
        return request.type === 'append';
      }),
    ).toBe(false);
    await persistence.dispose();
  });

  it('consumes hash and cleanup rejections even when diagnostics throws', async () => {
    const reportDetachedFailure = jest.fn();
    const fireAndForgetInvoker = createFireAndForgetInvoker({reportError: reportDetachedFailure});
    const cleanupFailure = new Error('Cleanup rejected');
    const dispose = jest.fn(async (): Promise<void> => {
      throw cleanupFailure;
    });
    const bindAccount = jest.fn(() => {
      return task.reject('unavailable' as const);
    });
    const notify = createAuthenticatedAccountBinding({
      fireAndForgetInvoker,
      onAccountBound: noop,
      persistence: Maybe.just({bindAccount, dispose}),
      async hashQualifiedId(): Promise<string> {
        throw new Error('Hash rejected');
      },
      reportFailure() {
        throw new Error('Diagnostics failed');
      },
    });

    await expect(notify(qualifiedId)).resolves.toBeUndefined();
    await fireAndForgetInvoker.waitUntilAllSettled();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(bindAccount).not.toHaveBeenCalled();
    expect(reportDetachedFailure).toHaveBeenCalledTimes(1);
    expect(reportDetachedFailure).toHaveBeenCalledWith(cleanupFailure);
  });

  it('contains synchronous binding failures and disables persistence', async () => {
    const fireAndForgetInvoker = createFireAndForgetInvoker({reportError: noop});
    const dispose = jest.fn(asyncNoop);
    const notify = createAuthenticatedAccountBinding({
      fireAndForgetInvoker,
      onAccountBound: noop,
      persistence: Maybe.just({
        bindAccount(): never {
          throw new Error('Binding threw');
        },
        dispose,
      }),
      async hashQualifiedId() {
        return accountIdentifier;
      },
      reportFailure: noop,
    });

    await expect(notify(qualifiedId)).resolves.toBeUndefined();
    await fireAndForgetInvoker.waitUntilAllSettled();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
