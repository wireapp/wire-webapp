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
import {asyncNoop, noop} from 'noop-esm';
import {Maybe, task} from 'true-myth';

import {createAuthenticatedAccountBinding} from './createAuthenticatedAccountBinding';
import {createBrowserLogPersistence, type BrowserLogPersistence} from './createBrowserLogPersistence';
import {createLogWorkerConnectionForTest} from './test/createLogWorkerConnectionForTest';

import {loadAuthenticatedSelfUser} from '../main/loadAuthenticatedSelfUser';

const qualifiedId = {domain: 'example.com', id: 'self-user'};
const accountIdentifier = 'a'.repeat(64);

function createPersistenceFixture(): {
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

  return {persistence, worker};
}

describe('authenticated account log binding', () => {
  it('does nothing when persistence is disabled or unsupported, including no crypto access', async () => {
    const hashQualifiedId = jest.fn();
    const reportFailure = jest.fn();
    const notify = createAuthenticatedAccountBinding({
      persistence: Maybe.nothing(),
      hashQualifiedId,
      reportFailure,
    });

    await expect(notify(qualifiedId)).resolves.toBeUndefined();
    expect(hashQualifiedId).not.toHaveBeenCalled();
    expect(reportFailure).not.toHaveBeenCalled();
  });

  it('starts the write barrier after hashing and before startup continues without awaiting acknowledgement', async () => {
    const {persistence, worker} = createPersistenceFixture();
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
    persistence.write('{"bound":true}', 'info');
    await persistence.flush();
    expect(worker.requests.at(-1)).toMatchObject({type: 'append', lines: ['{"bound":true}\n']});
  });

  it.each(['unavailable', 'rejected'] as const)(
    'continues login and stops old-account writes when hashing is %s',
    async failure => {
      const {persistence, worker} = createPersistenceFixture();
      await using cleanup = persistence;
      await persistence.bindAccount('b'.repeat(64));
      const reportFailure = jest.fn();
      const onAuthenticatedAccount = createAuthenticatedAccountBinding({
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
    },
  );

  it('handles a rejected binding Task, keeps writes closed, and preserves successful login', async () => {
    const {persistence, worker} = createPersistenceFixture();
    const reportFailure = jest.fn();
    worker.state.onPost = request => {
      worker.emitMessage({
        requestIdentifier: request.requestIdentifier,
        outcome: request.type === 'bind-account' ? 'failed' : 'complete',
      });
    };
    const failed = Promise.withResolvers<void>();
    const onAuthenticatedAccount = createAuthenticatedAccountBinding({
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
    persistence.write('{"afterFailure":true}', 'info');
    await persistence.flush();
    expect(persistence.getStatistics()).toMatchObject({suspended: true, failures: 1, droppedRecords: 1});
    expect(reportFailure).toHaveBeenCalledTimes(1);
    expect(
      worker.requests.some(request => {
        return request.type === 'append';
      }),
    ).toBe(false);
    await persistence.dispose();
  });

  it('consumes hash and cleanup rejections even when diagnostics throws', async () => {
    const dispose = jest.fn(async (): Promise<void> => {
      throw new Error('Cleanup rejected');
    });
    const bindAccount = jest.fn(() => {
      return task.reject('unavailable' as const);
    });
    const notify = createAuthenticatedAccountBinding({
      persistence: Maybe.just({bindAccount, dispose}),
      async hashQualifiedId(): Promise<string> {
        throw new Error('Hash rejected');
      },
      reportFailure() {
        throw new Error('Diagnostics failed');
      },
    });

    await expect(notify(qualifiedId)).resolves.toBeUndefined();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(bindAccount).not.toHaveBeenCalled();
  });

  it('contains synchronous binding failures and disables persistence', async () => {
    const dispose = jest.fn(asyncNoop);
    const notify = createAuthenticatedAccountBinding({
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
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
