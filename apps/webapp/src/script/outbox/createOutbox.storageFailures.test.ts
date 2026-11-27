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

import {
  createOutboxTestKit,
  createStoredSnapshot,
  type OutboxTestKit,
  type TestKind,
} from './testing/createOutboxTestKit';
import type {AttemptOutcome} from './types';

type Breakage = {
  name: string;
  /** Makes every `append` fail the way the name says */
  breakStore: (kit: OutboxTestKit) => void;
  answer: object;
};

const BREAKAGES: Breakage[] = [
  {
    name: 'fails',
    breakStore: kit => {
      kit.store.fail('append', true);
    },
    answer: {outcome: 'storage-failed', errorName: 'TestFailure'},
  },
  {
    name: 'is full',
    breakStore: kit => {
      kit.store.fill(true);
    },
    answer: {outcome: 'storage-full'},
  },
];

type FailingCall = {
  name: string;
  /** Brings the operation `key` to where the call applies, with the outbox paused */
  prepare: (kit: OutboxTestKit, testKind: TestKind) => Promise<unknown>;
  call: (kit: OutboxTestKit, testKind: TestKind) => Promise<unknown>;
};

const FAILING_CALLS: FailingCall[] = [
  {
    name: 'the enqueue of a version',
    prepare: async (kit, testKind) => {
      return kit.enqueueKeyed(testKind, 'key');
    },
    call: async (kit, testKind) => {
      return kit.enqueue(testKind, {correlationKey: 'key', payload: {text: 'second'}});
    },
  },
  {
    name: 'hold',
    prepare: async (kit, testKind) => {
      return kit.enqueueKeyed(testKind, 'key');
    },
    call: async kit => {
      return kit.outbox.hold('key');
    },
  },
  {
    name: 'release',
    prepare: async (kit, testKind) => {
      await kit.enqueueKeyed(testKind, 'key');
      return kit.outbox.hold('key');
    },
    call: async kit => {
      return kit.outbox.release('key');
    },
  },
  {
    name: 'deadLetter',
    prepare: async (kit, testKind) => {
      return kit.enqueueKeyed(testKind, 'key');
    },
    call: async kit => {
      return kit.outbox.deadLetter('key');
    },
  },
  {
    name: 'delete',
    prepare: async (kit, testKind) => {
      return kit.enqueueKeyed(testKind, 'key');
    },
    call: async kit => {
      return kit.outbox.delete('key');
    },
  },
];

describe('createOutbox storage failures', () => {
  let kit: OutboxTestKit;

  beforeEach(() => {
    kit = createOutboxTestKit();
  });

  function expectStopped(): void {
    expect(kit.outbox.isStarted()).toBe(false);
    expect(kit.outbox.findByCorrelationKey('key')).toEqual({outcome: 'outbox-not-started'});
  }

  describe.each(BREAKAGES)('when a save $name', ({breakStore, answer}) => {
    it.each(FAILING_CALLS)('stops the outbox when $name cannot be stored, and answers it', async ({prepare, call}) => {
      const testKind = kit.registerKind();
      await kit.start({run: false});
      await prepare(kit, testKind);
      const storedCount = kit.store.history('operation-1').length;
      breakStore(kit);

      expect(await call(kit, testKind)).toEqual(answer);

      expectStopped();
      expect(await kit.outbox.hold('key')).toEqual({outcome: 'outbox-not-started'});
      expect(kit.store.history('operation-1')).toHaveLength(storedCount);
    });

    it('stops the outbox when the start of an attempt cannot be stored', async () => {
      const testKind = kit.registerKind();
      await kit.start({run: false});
      await kit.enqueueKeyed(testKind, 'key');
      breakStore(kit);

      kit.outbox.resume();
      await kit.clock.settle();

      expectStopped();
      expect(testKind.attempts).toHaveLength(0);
      expect(kit.triggersOf('operation-1')).toEqual(['operation-queued']);
    });

    it.each([
      'attempt-succeeded',
      'attempt-failed',
      'attempt-held',
      'attempt-dead-lettered',
      'attempt-deleted',
    ] as const)('stops the outbox when the end of the attempt, %s, cannot be stored', async outcome => {
      const testKind = await kit.startKind();
      await kit.enqueueKeyed(testKind, 'key');
      breakStore(kit);

      await testKind.lastAttempt().answer({outcome} satisfies AttemptOutcome);

      expectStopped();
      expect(kit.triggersOf('operation-1')).toEqual(['operation-queued', 'attempt-started']);
      expect(
        testKind.changes.map(({state}) => {
          return state;
        }),
      ).toEqual(['queued', 'in-progress']);
    });

    it('stops the outbox when an expiry cannot be stored', async () => {
      const testKind = await kit.startKind({expiresAfterMilliseconds: 1_000});
      kit.outbox.pause();
      await kit.enqueueKeyed(testKind, 'key');
      breakStore(kit);

      await kit.clock.advance(1_000);

      expectStopped();
      expect(kit.triggersOf('operation-1')).toEqual(['operation-queued']);
    });

    it('aborts the running attempts, answers the commands waiting on them, and clears the timers', async () => {
      const testKind = await kit.startKind({attemptTimeoutMilliseconds: 10_000});
      await kit.enqueueKeyed(testKind, 'running', {laneKey: 'lane'});
      await kit.enqueueKeyed(testKind, 'waiting', {laneKey: 'lane'});
      const holdResult = kit.outbox.hold('running');
      await kit.clock.settle();
      breakStore(kit);

      expect(await kit.outbox.hold('waiting')).toEqual(answer);

      expect(await holdResult).toEqual(answer);
      expect(testKind.attemptOf('running').signal.aborted).toBe(true);
      expect(kit.clock.pendingTimers()).toEqual([]);
    });

    it('logs the stop once, with the outcome and the name of the error only', async () => {
      const testKind = kit.registerKind();
      await kit.start({run: false});
      await kit.enqueueKeyed(testKind, 'key');
      breakStore(kit);

      await kit.outbox.hold('key');
      await kit.outbox.hold('key');

      expect(kit.logger.entriesOf('Stopped by a failed save')).toEqual([
        {level: 'error', message: 'Stopped by a failed save', attributes: answer},
      ]);
    });
  });

  describe('when a new operation does not fit', () => {
    it('refuses its enqueue storage-full, and keeps running', async () => {
      const testKind = await kit.startKind();
      kit.store.fill(true);

      expect(await kit.enqueueKeyed(testKind, 'refused')).toEqual({outcome: 'storage-full'});
      expect(kit.outbox.isStarted()).toBe(true);
      expect(kit.store.operationIds()).toEqual([]);
      expect(testKind.changes).toEqual([]);
      kit.store.fill(false);

      expect(await kit.enqueueKeyed(testKind, 'key')).toMatchObject({outcome: 'operation-queued'});
      expect(testKind.attemptedTexts()).toEqual(['key']);
      expect(kit.logger.entriesOf('Stopped by a failed save')).toEqual([]);
    });
  });

  describe('when the store rejects', () => {
    it('answers storage-failed with the name of the error only', async () => {
      const testKind = await kit.startKind();
      kit.store.rejectWith('append', new RangeError('contains secret'));

      expect(await kit.enqueue(testKind, {correlationKey: 'key'})).toEqual({
        outcome: 'storage-failed',
        errorName: 'RangeError',
      });

      expectStopped();
      expect(JSON.stringify(kit.logger.entries)).not.toContain('secret');
    });
  });

  describe('when the store cannot delete', () => {
    it('stores the final snapshot first, then deletes the operation', async () => {
      const testKind = await kit.startKind();
      await kit.enqueueKeyed(testKind, 'key');
      const callsBefore = kit.store.calls.length;

      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});

      expect(kit.store.calls.slice(callsBefore)).toEqual([
        {method: 'append', snapshot: expect.objectContaining({trigger: 'attempt-succeeded', state: 'succeeded'})},
        {method: 'remove', operationIds: ['operation-1']},
      ]);
    });

    it('does not delete the operation when its final snapshot cannot be stored', async () => {
      const testKind = await kit.startKind();
      kit.outbox.pause();
      await kit.enqueueKeyed(testKind, 'key');
      kit.store.fail('append', true);

      await kit.outbox.delete('key');

      expect(
        kit.store.calls.filter(({method}) => {
          return method === 'remove';
        }),
      ).toEqual([]);
    });

    it('keeps running, and counts the operation as ended once its final snapshot is stored', async () => {
      const testKind = await kit.startKind();
      await kit.enqueueKeyed(testKind, 'key');
      const holdResult = kit.outbox.hold('key');
      await kit.clock.settle();
      kit.store.fail('remove', true);

      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});

      expect(await holdResult).toMatchObject({outcome: 'operation-succeeded', operation: {state: 'succeeded'}});
      expect(kit.outbox.isStarted()).toBe(true);
      expect(kit.outbox.findByCorrelationKey('key')).toEqual({outcome: 'operation-not-found'});
      expect(testKind.changes.at(-1)).toMatchObject({state: 'succeeded'});
      expect(await kit.enqueueKeyed(testKind, 'next')).toMatchObject({outcome: 'operation-queued'});
      expect(testKind.attemptedTexts()).toEqual(['key', 'next']);
    });

    it('logs a warning once, with the name of the error only', async () => {
      const testKind = await kit.startKind();
      await kit.enqueueKeyed(testKind, 'key');
      kit.store.rejectWith('remove', new RangeError('contains secret'));

      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});
      await kit.clock.advance(60_000);

      expect(kit.logger.entriesOf('Operation not deleted')).toEqual([
        {level: 'warn', message: 'Operation not deleted', attributes: {errorName: 'RangeError'}},
      ]);
      expect(kit.logger.entriesOf('Stopped by a failed save')).toEqual([]);
      expect(JSON.stringify(kit.logger.entries)).not.toContain('secret');
    });

    it('deletes what the failed delete left behind when the outbox starts again', async () => {
      const testKind = await kit.startKind();
      await kit.enqueueKeyed(testKind, 'key');
      kit.store.fail('remove', true);
      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});
      kit.store.fail('remove', false);
      await kit.outbox.stop();
      expect(kit.store.operationIds()).toEqual(['operation-1']);

      await kit.start();

      expect(kit.store.operationIds()).toEqual([]);
      expect(kit.outbox.findByCorrelationKey('key')).toEqual({outcome: 'operation-not-found'});
      expect(kit.logger.entriesOf('Operations loaded').at(-1)?.attributes).toEqual({count: 0, quarantinedCount: 1});
      expect(testKind.attempts).toHaveLength(1);
    });

    it('answers start storage-failed when the leftovers cannot be deleted, and deletes them when start is called again', async () => {
      const testKind = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: testKind.kind.name, state: 'succeeded'}));
      kit.store.fail('remove', true);

      expect(await kit.outbox.start()).toEqual({outcome: 'storage-failed', errorName: 'TestFailure'});
      expect(kit.outbox.isStarted()).toBe(false);
      kit.store.fail('remove', false);

      expect(await kit.outbox.start()).toEqual({outcome: 'outbox-started'});
      expect(kit.store.operationIds()).toEqual([]);
    });
  });

  describe('starting again after a failed save', () => {
    it('loads from the store, and retries the attempt that was running', async () => {
      const testKind = await kit.startKind();
      await kit.enqueueKeyed(testKind, 'key');
      kit.store.fail('append', true);
      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});
      kit.store.fail('append', false);

      expect(await kit.outbox.start()).toEqual({outcome: 'outbox-started'});
      await kit.clock.settle();

      expect(kit.triggersOf('operation-1')).toEqual([
        'operation-queued',
        'attempt-started',
        'attempt-interrupted',
        'attempt-started',
      ]);
      expect(testKind.lastAttempt().operation).toMatchObject({id: 'operation-1', attempts: 2});
    });
  });
});
