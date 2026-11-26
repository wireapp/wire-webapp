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

import {createFakeClock} from './createFakeClock';
import {createFakeRandom} from './createFakeRandom';
import {createInMemoryOutboxStore} from './createInMemoryOutboxStore';
import {createStoredSnapshot} from './createOutboxTestKit';
import {createRecordingLogger} from './createRecordingLogger';
import type {OperationSnapshot} from '../types';

describe('createInMemoryOutboxStore', () => {
  const snapshot = (seq: number, id = 'a'): OperationSnapshot => {
    return createStoredSnapshot({kind: 'k', id, seq});
  };

  it('loads the newest snapshot of every operation', async () => {
    const store = createInMemoryOutboxStore();
    await store.append(snapshot(1));
    await store.append(snapshot(2));
    await store.append(snapshot(1, 'b'));

    const loaded = await store.loadLatest();

    expect(loaded).toMatchObject({type: 'snapshots-loaded', quarantinedCount: 0});
    expect(
      loaded.type === 'snapshots-loaded' &&
        loaded.operations.map(({id, seq}) => {
          return [id, seq];
        }),
    ).toEqual([
      ['a', 2],
      ['b', 1],
    ]);
  });

  it('keeps every snapshot as history until the operation is removed', async () => {
    const store = createInMemoryOutboxStore();
    await store.append(snapshot(1));
    await store.append(snapshot(2));
    expect(store.history('a')).toHaveLength(2);

    expect(await store.remove(['a'])).toEqual({type: 'snapshots-removed'});

    expect(store.history('a')).toEqual([]);
    expect(store.operationIds()).toEqual([]);
  });

  it('answers storage-failed while told to, and counts the calls', async () => {
    const store = createInMemoryOutboxStore();
    store.fail('append', true);

    expect(await store.append(snapshot(1))).toEqual({type: 'storage-failed', errorName: 'TestFailure'});
    store.fail('append', false);
    expect(await store.append(snapshot(1))).toEqual({type: 'snapshot-appended'});
    expect(
      store.calls.map(({method}) => {
        return method;
      }),
    ).toEqual(['append', 'append']);
  });

  it('lets a number of calls work, then answers storage-failed until told to stop failing', async () => {
    const store = createInMemoryOutboxStore();
    store.failAfter('append', 2);

    expect((await store.append(snapshot(1))).type).toBe('snapshot-appended');
    expect((await store.append(snapshot(2))).type).toBe('snapshot-appended');
    expect((await store.append(snapshot(3))).type).toBe('storage-failed');
    expect((await store.append(snapshot(3))).type).toBe('storage-failed');
    store.fail('append', false);
    expect((await store.append(snapshot(3))).type).toBe('snapshot-appended');
  });

  it('answers storage-full to an append while full', async () => {
    const store = createInMemoryOutboxStore();
    store.fill(true);

    expect(await store.append(snapshot(1))).toEqual({type: 'storage-full'});
    expect(store.operationIds()).toEqual([]);
  });

  it('rejects while told to, to test the safety net', async () => {
    const store = createInMemoryOutboxStore();
    store.rejectWith('remove', new Error('boom'));

    await expect(store.remove(['a'])).rejects.toThrow('boom');
    store.rejectWith('remove', undefined);
    await expect(store.remove(['a'])).resolves.toEqual({type: 'snapshots-removed'});
  });
});

describe('createFakeClock', () => {
  it('moves server time and timers together, and server time alone on request', async () => {
    const clock = createFakeClock(100);
    const fired: number[] = [];
    setTimeout(() => {
      return fired.push(clock.getServerTime());
    }, 50);

    await clock.advance(49);
    expect(fired).toEqual([]);
    await clock.advance(1);
    clock.jumpServerTime(10);

    expect(fired).toEqual([150]);
    expect(clock.getServerTime()).toBe(160);
    clock.dispose();
  });
});

describe('createFakeRandom', () => {
  it('answers the constant, 1 by default', () => {
    expect(createFakeRandom().random()).toBe(1);
    const random = createFakeRandom(0.25);
    random.set(0.75);

    expect(random.random()).toBe(0.75);
    expect(random.random()).toBe(0.75);
  });

  it('answers the queued values first, in order', () => {
    const random = createFakeRandom(0.5);
    random.queue(0.1, 0.2);

    expect([random.random(), random.random(), random.random()]).toEqual([0.1, 0.2, 0.5]);
  });
});

describe('createRecordingLogger', () => {
  it('records each entry with its level, and finds them by message', () => {
    const logger = createRecordingLogger();

    logger.info('call', {outcome: 'done'});
    logger.warn('call');
    logger.error('other');

    expect(
      logger.entries.map(({level}) => {
        return level;
      }),
    ).toEqual(['info', 'warn', 'error']);
    expect(logger.entriesOf('call')).toHaveLength(2);
    expect(logger.entriesOf('call')[0].attributes).toEqual({outcome: 'done'});
  });
});
