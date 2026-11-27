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

/** @jest-environment node */

import 'core-js/stable/structured-clone';
import 'fake-indexeddb/auto';

import {Dexie, type Table} from 'dexie';
import {v4 as uuidv4} from 'uuid';

import type {OperationSnapshot, OutboxStore} from '../../outbox';
import {DexieDatabase} from '../storage/dexieDatabase';

import {createDexieOutboxStore} from './createDexieOutboxStore';

function snapshotOf(id: string, seq: number, overrides: Partial<OperationSnapshot> = {}): OperationSnapshot {
  return {
    schemaVersion: 2,
    id,
    seq,
    trigger: 'operation-queued',
    at: 1000 + seq,
    kind: 'message',
    payload: {text: `payload ${seq}`},
    correlation: {state: 'uncorrelated'},
    lane: {state: 'no-lane'},
    expiry: {state: 'never-expires'},
    limits: {attemptTimeout: {state: 'never-times-out'}},
    queuedSeq: 1,
    queuedAt: 1000,
    state: 'queued',
    attempts: 0,
    ...overrides,
  };
}

describe('createDexieOutboxStore', () => {
  let database: DexieDatabase;

  beforeEach(async () => {
    database = new DexieDatabase(`database-${uuidv4()}`);
    await database.open();
  });

  afterEach(async () => {
    database.close();
    await Dexie.delete(database.name);
  });

  function createStore(): OutboxStore {
    return createDexieOutboxStore(() => {
      return database.outbox;
    });
  }

  it('loads nothing from an empty table', async () => {
    expect(await createStore().loadLatest()).toEqual({
      outcome: 'snapshots-loaded',
      operations: [],
      quarantinedCount: 0,
    });
  });

  it('appends snapshots and loads the newest one of every operation', async () => {
    const store = createStore();
    const first = snapshotOf('a', 1);
    const second = snapshotOf('a', 2, {state: 'in-progress', trigger: 'attempt-started'});
    const other = snapshotOf('b', 1);

    expect(await store.append(first)).toEqual({outcome: 'snapshot-appended'});
    expect(await store.append(other)).toEqual({outcome: 'snapshot-appended'});
    expect(await store.append(second)).toEqual({outcome: 'snapshot-appended'});

    const loadResult = await store.loadLatest();

    if (loadResult.outcome !== 'snapshots-loaded') {
      throw new Error(`Unexpected outcome ${loadResult.outcome}`);
    }
    expect(loadResult.quarantinedCount).toBe(0);
    expect(loadResult.operations).toHaveLength(2);
    expect(loadResult.operations).toEqual(
      expect.arrayContaining([expect.objectContaining(second), expect.objectContaining(other)]),
    );
  });

  it('does not add the generated key to the appended snapshot', async () => {
    const snapshot = snapshotOf('a', 1);

    await createStore().append(snapshot);

    expect(snapshot).toEqual(snapshotOf('a', 1));
  });

  it('loads snapshots without the generated key so that the next snapshot can be appended', async () => {
    const store = createStore();
    await store.append(snapshotOf('a', 1));

    const loadResult = await store.loadLatest();
    if (loadResult.outcome !== 'snapshots-loaded') {
      throw new Error(`Unexpected outcome ${loadResult.outcome}`);
    }
    const [loaded] = loadResult.operations;
    expect(loaded).not.toHaveProperty('primary_key');

    const next: OperationSnapshot = {...loaded, seq: 2, trigger: 'attempt-started', state: 'in-progress'};
    expect(await store.append(next)).toEqual({outcome: 'snapshot-appended'});
  });

  it('removes every snapshot of the given operations only', async () => {
    const store = createStore();
    await store.append(snapshotOf('a', 1));
    await store.append(snapshotOf('a', 2));
    await store.append(snapshotOf('b', 1));

    expect(await store.remove(['a'])).toEqual({outcome: 'snapshots-removed'});

    const loadResult = await store.loadLatest();
    expect(loadResult).toEqual({
      outcome: 'snapshots-loaded',
      operations: [expect.objectContaining({id: 'b'})],
      quarantinedCount: 0,
    });
  });

  it('quarantines an operation whose newest snapshot is not plausible, and keeps the others', async () => {
    const store = createStore();
    await store.append(snapshotOf('good', 1));
    await store.append(snapshotOf('broken', 1));
    await store.append(snapshotOf('broken', 2, {state: undefined as unknown as OperationSnapshot['state']}));
    await database.outbox.add({id: 'no-kind', seq: 1, state: 'queued'} as unknown as OperationSnapshot);

    const loadResult = await store.loadLatest();

    expect(loadResult).toEqual({
      outcome: 'snapshots-loaded',
      operations: [expect.objectContaining({id: 'good'})],
      quarantinedCount: 2,
    });
    expect(await database.outbox.count()).toBe(1);
  });

  it('quarantines a row without an id', async () => {
    await database.outbox.add({seq: 1, state: 'queued', kind: 'message'} as unknown as OperationSnapshot);

    const loadResult = await createStore().loadLatest();

    expect(loadResult).toEqual({outcome: 'snapshots-loaded', operations: [], quarantinedCount: 1});
    expect(await database.outbox.count()).toBe(0);
  });

  describe('when the table fails', () => {
    function createStoreOverFailingTable(error: Error): OutboxStore {
      const failingTable = {
        add: jest.fn().mockRejectedValue(error),
        toArray: jest.fn().mockRejectedValue(error),
        where: jest.fn().mockImplementation(() => {
          throw error;
        }),
      } as unknown as Table<OperationSnapshot, number>;
      return createDexieOutboxStore(() => {
        return failingTable;
      });
    }

    function errorNamed(name: string): Error {
      const error = new Error('failure');
      error.name = name;
      return error;
    }

    it('answers storage-full to a quota error on append', async () => {
      const store = createStoreOverFailingTable(errorNamed('QuotaExceededError'));

      expect(await store.append(snapshotOf('a', 1))).toEqual({outcome: 'storage-full'});
    });

    it('answers storage-failed with the error name to any other error, without rejecting', async () => {
      const store = createStoreOverFailingTable(errorNamed('DataError'));

      expect(await store.append(snapshotOf('a', 1))).toEqual({outcome: 'storage-failed', errorName: 'DataError'});
      expect(await store.loadLatest()).toEqual({outcome: 'storage-failed', errorName: 'DataError'});
      expect(await store.remove(['a'])).toEqual({outcome: 'storage-failed', errorName: 'DataError'});
    });

    it('answers storage-failed when the table is not available', async () => {
      const store = createDexieOutboxStore(() => {
        throw new Error('The database is not open');
      });

      expect(await store.loadLatest()).toEqual({outcome: 'storage-failed', errorName: 'Error'});
    });
  });
});
