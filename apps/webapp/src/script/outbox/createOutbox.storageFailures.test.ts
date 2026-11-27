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

import {createOutbox} from './createOutbox';
import {
  createOutboxTestKit,
  createStoredSnapshot,
  type OutboxTestKit,
  type TestKind,
} from './testing/createOutboxTestKit';
import type {AttemptOutcome, Kind} from './types';

type Breakage = {
  name: string;
  /** Makes every `append` fail the way the name says */
  breakStore: (kit: OutboxTestKit) => void;
  repairStore: (kit: OutboxTestKit) => void;
  answer: object;
};

const BREAKAGES: Breakage[] = [
  {
    name: 'fails',
    breakStore: kit => {
      kit.store.fail('append', true);
    },
    repairStore: kit => {
      kit.store.fail('append', false);
    },
    answer: {outcome: 'storage-failed', errorName: 'TestFailure'},
  },
  {
    name: 'is full',
    breakStore: kit => {
      kit.store.fill(true);
    },
    repairStore: kit => {
      kit.store.fill(false);
    },
    answer: {outcome: 'storage-full'},
  },
];

describe('createOutbox storage failures', () => {
  let kit: OutboxTestKit;

  beforeEach(() => {
    kit = createOutboxTestKit();
  });

  async function startWith(overrides: Partial<Kind<{text: string}>> = {}): Promise<TestKind> {
    const testKind = kit.registerKind(overrides);
    await kit.start();
    return testKind;
  }

  async function enqueue(testKind: TestKind, correlationKey: string): Promise<void> {
    await kit.enqueue(testKind, {payload: {text: correlationKey}, correlationKey});
  }

  function triggersOf(operationId: string): string[] {
    return kit.store.history(operationId).map(({trigger}) => {
      return trigger;
    });
  }

  describe.each(BREAKAGES)('when the store $name', ({breakStore, repairStore, answer}) => {
    it('answers enqueue, and keeps no operation', async () => {
      const testKind = await startWith();
      breakStore(kit);

      expect(await kit.enqueue(testKind, {correlationKey: 'key'})).toEqual(answer);

      expect(kit.outbox.findByCorrelationKey('key')).toEqual({outcome: 'operation-not-found'});
      expect(kit.store.operationIds()).toEqual([]);
      expect(testKind.changes).toEqual([]);
      expect(testKind.attempts).toHaveLength(0);
    });

    it('answers the enqueue of a version, and keeps the operation as it was', async () => {
      const testKind = await startWith();
      kit.outbox.pause();
      await kit.enqueue(testKind, {correlationKey: 'key', payload: {text: 'first'}});
      breakStore(kit);

      expect(await kit.enqueue(testKind, {correlationKey: 'key', payload: {text: 'second'}})).toEqual(answer);

      expect(testKind.operation('key')).toMatchObject({state: 'queued', payload: {text: 'first'}});
      expect(triggersOf('operation-1')).toEqual(['operation-queued']);
    });

    it('answers hold, and leaves the operation queued', async () => {
      const testKind = await startWith();
      kit.outbox.pause();
      await enqueue(testKind, 'key');
      breakStore(kit);

      expect(await kit.outbox.hold('key')).toEqual(answer);

      expect(testKind.operation('key').state).toBe('queued');
      expect(testKind.changes).toHaveLength(1);
    });

    it('answers release, and leaves the operation on hold', async () => {
      const testKind = await startWith();
      kit.outbox.pause();
      await enqueue(testKind, 'key');
      await kit.outbox.hold('key');
      breakStore(kit);

      expect(await kit.outbox.release('key')).toEqual(answer);

      expect(testKind.operation('key').state).toBe('on-hold');
    });

    it('answers drop, and leaves the operation as it was', async () => {
      const testKind = await startWith();
      kit.outbox.pause();
      await enqueue(testKind, 'key');
      breakStore(kit);

      expect(await kit.outbox.drop('key')).toEqual(answer);

      expect(testKind.operation('key').state).toBe('queued');
      expect(
        kit.store.calls.filter(({method}) => {
          return method === 'remove';
        }),
      ).toEqual([]);
    });

    it('answers drop without aborting the running attempt', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');
      const attempt = testKind.lastAttempt();
      breakStore(kit);

      expect(await kit.outbox.drop('key')).toEqual(answer);
      expect(attempt.signal.aborted).toBe(false);
      repairStore(kit);
      await attempt.answer({outcome: 'attempt-succeeded'});

      expect(testKind.changes.at(-1)).toMatchObject({state: 'succeeded'});
    });

    it('keeps an operation queued when the start of its attempt cannot be stored', async () => {
      const testKind = kit.registerKind();
      await kit.start({run: false});
      await enqueue(testKind, 'key');
      breakStore(kit);

      kit.outbox.resume();
      await kit.clock.settle();

      expect(testKind.operation('key')).toMatchObject({state: 'queued', attempts: 0});
      expect(testKind.attempts).toHaveLength(0);
    });

    it('starts the attempt again after the backoff', async () => {
      const testKind = kit.registerKind();
      await kit.start({run: false});
      await enqueue(testKind, 'key');
      breakStore(kit);
      kit.outbox.resume();
      await kit.clock.settle();
      repairStore(kit);

      await kit.clock.advance(4_999);
      expect(testKind.attempts).toHaveLength(0);
      await kit.clock.advance(1);

      expect(testKind.attempts).toHaveLength(1);
      expect(testKind.lastAttempt().operation).toMatchObject({state: 'in-progress', attempts: 1});
    });

    it('starts the attempt again at once on resume', async () => {
      const testKind = kit.registerKind();
      await kit.start({run: false});
      await enqueue(testKind, 'key');
      breakStore(kit);
      kit.outbox.resume();
      await kit.clock.settle();
      repairStore(kit);

      kit.outbox.resume();
      await kit.clock.settle();

      expect(testKind.attempts).toHaveLength(1);
    });

    it('holds back the attempts of the other operations too, until the backoff has passed', async () => {
      const testKind = kit.registerKind();
      await kit.start({run: false});
      await enqueue(testKind, 'first');
      breakStore(kit);
      kit.outbox.resume();
      await kit.clock.settle();
      repairStore(kit);

      await enqueue(testKind, 'second');
      expect(testKind.attempts).toHaveLength(0);
      await kit.clock.advance(5_000);

      expect(testKind.attempts).toHaveLength(2);
    });

    it('logs the pass that hit the failure, with the outcome only', async () => {
      const testKind = kit.registerKind();
      await kit.start({run: false});
      await enqueue(testKind, 'key');
      breakStore(kit);

      kit.outbox.resume();
      await kit.clock.settle();

      expect(kit.logger.entriesOf('Pass hit a store failure')).toEqual([
        {
          level: 'warn',
          message: 'Pass hit a store failure',
          attributes: {outcomes: [(answer as {outcome: string}).outcome]},
        },
      ]);
    });

    it.each([
      'attempt-succeeded',
      'attempt-failed',
      'attempt-held',
      'attempt-dead-lettered',
      'attempt-dropped',
    ] as const)('keeps the operation in progress when the end of the attempt, %s, cannot be stored', async outcome => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');
      breakStore(kit);

      await testKind.lastAttempt().answer({outcome} satisfies AttemptOutcome);

      expect(testKind.operation('key').state).toBe('in-progress');
      expect(
        testKind.changes.map(({state}) => {
          return state;
        }),
      ).toEqual(['queued', 'in-progress']);
    });

    it.each([
      ['attempt-succeeded', 'succeeded'],
      ['attempt-failed', 'queued'],
      ['attempt-held', 'on-hold'],
      ['attempt-dead-lettered', 'dead-lettered'],
      ['attempt-dropped', 'dropped'],
    ] as const)('stores the end of the attempt, %s, again after the backoff', async (outcome, state) => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');
      breakStore(kit);
      await testKind.lastAttempt().answer({outcome});
      repairStore(kit);

      await kit.clock.advance(4_999);
      expect(testKind.operation('key').state).toBe('in-progress');
      await kit.clock.advance(1);

      expect(testKind.changes.at(-1)?.state).toBe(state);
    });

    it('keeps the commands parked on the attempt waiting until its end is stored', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');
      const holdResult = kit.outbox.hold('key');
      await kit.clock.settle();
      breakStore(kit);
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
      let isAnswered = false;
      void holdResult.finally(() => {
        isAnswered = true;
      });
      await kit.clock.settle();
      expect(isAnswered).toBe(false);
      repairStore(kit);

      await kit.clock.advance(5_000);

      expect(await holdResult).toMatchObject({outcome: 'operation-held', operation: {state: 'on-hold'}});
    });

    it('keeps a queued operation that is due to expire, and expires it after the backoff', async () => {
      const testKind = await startWith({expiresAfterMilliseconds: 1_000});
      kit.outbox.pause();
      await enqueue(testKind, 'key');
      breakStore(kit);

      await kit.clock.advance(1_000);
      expect(testKind.operation('key').state).toBe('queued');
      repairStore(kit);
      await kit.clock.advance(5_000);

      expect(testKind.operation('key').state).toBe('dead-lettered');
      expect(triggersOf('operation-1').at(-1)).toBe('operation-expired');
    });
  });

  describe('when the store rejects', () => {
    it('answers enqueue storage-failed with the name of the error only', async () => {
      const testKind = await startWith();
      kit.store.rejectWith('append', new RangeError('contains secret'));

      expect(await kit.enqueue(testKind, {correlationKey: 'key'})).toEqual({
        outcome: 'storage-failed',
        errorName: 'RangeError',
      });

      expect(JSON.stringify(kit.logger.entries)).not.toContain('secret');
    });

    it('answers the other commands storage-failed too', async () => {
      const testKind = await startWith();
      kit.outbox.pause();
      await enqueue(testKind, 'key');
      kit.store.rejectWith('append', new TypeError('rejected'));

      expect(await kit.outbox.hold('key')).toEqual({outcome: 'storage-failed', errorName: 'TypeError'});
      expect(await kit.outbox.drop('key')).toEqual({outcome: 'storage-failed', errorName: 'TypeError'});
      expect(testKind.operation('key').state).toBe('queued');
    });

    it('settles the end of an attempt again after the backoff', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');
      kit.store.rejectWith('append', new TypeError('rejected'));
      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});
      kit.store.rejectWith('append', undefined);

      await kit.clock.advance(5_000);

      expect(testKind.changes.at(-1)).toMatchObject({state: 'succeeded'});
    });
  });

  describe('when the store cannot delete', () => {
    it('stores the final snapshot first, then deletes the operation', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');
      const callsBefore = kit.store.calls.length;

      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});

      expect(kit.store.calls.slice(callsBefore)).toEqual([
        {method: 'append', snapshot: expect.objectContaining({trigger: 'attempt-succeeded', state: 'succeeded'})},
        {method: 'remove', operationIds: ['operation-1']},
      ]);
    });

    it('does not delete the operation when its final snapshot cannot be stored', async () => {
      const testKind = await startWith();
      kit.outbox.pause();
      await enqueue(testKind, 'key');
      kit.store.fail('append', true);

      await kit.outbox.drop('key');

      expect(
        kit.store.calls.filter(({method}) => {
          return method === 'remove';
        }),
      ).toEqual([]);
    });

    it('counts the operation as succeeded once its final snapshot is stored', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');
      const holdResult = kit.outbox.hold('key');
      await kit.clock.settle();
      kit.store.fail('remove', true);

      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});

      expect(await holdResult).toMatchObject({outcome: 'operation-succeeded', operation: {state: 'succeeded'}});
      expect(kit.outbox.findByCorrelationKey('key')).toEqual({outcome: 'operation-not-found'});
      expect(testKind.changes.at(-1)).toMatchObject({state: 'succeeded'});
      expect(kit.store.history('operation-1').at(-1)).toMatchObject({state: 'succeeded'});
    });

    it('counts the operation as dropped once its final snapshot is stored', async () => {
      const testKind = await startWith();
      kit.outbox.pause();
      await enqueue(testKind, 'key');
      kit.store.fail('remove', true);

      expect(await kit.outbox.drop('key')).toMatchObject({outcome: 'operation-dropped'});

      expect(kit.outbox.findByCorrelationKey('key')).toEqual({outcome: 'operation-not-found'});
      expect(testKind.changes.at(-1)).toMatchObject({state: 'dropped'});
    });

    it('logs the name of the error, and does not try to delete again', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');
      kit.store.rejectWith('remove', new RangeError('contains secret'));

      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});
      await kit.clock.advance(60_000);

      expect(kit.logger.entriesOf('Operation not deleted')).toEqual([
        {level: 'warn', message: 'Operation not deleted', attributes: {errorName: 'RangeError'}},
      ]);
      expect(JSON.stringify(kit.logger.entries)).not.toContain('secret');
      expect(
        kit.store.calls.filter(({method}) => {
          return method === 'remove';
        }),
      ).toHaveLength(1);
    });

    it('does not slow down the next attempts', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'first');
      kit.store.fail('remove', true);
      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});

      await enqueue(testKind, 'second');

      expect(testKind.attempts).toHaveLength(2);
    });

    it('does not reuse a snapshot number when the key is enqueued again', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');
      kit.store.fail('remove', true);
      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});

      await enqueue(testKind, 'key');

      expect(
        kit.store.history('operation-2').map(({seq}) => {
          return seq;
        }),
      ).toEqual([1, 2]);
    });

    it('deletes what the failed delete left behind when the outbox starts again', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');
      kit.store.fail('remove', true);
      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});
      kit.store.fail('remove', false);
      await kit.outbox.stop();
      expect(kit.store.operationIds()).toEqual(['operation-1']);

      const restarted = createOutbox(kit.dependencies);
      restarted.register(testKind.kind);

      expect(await restarted.start()).toEqual({outcome: 'outbox-started'});
      expect(kit.store.operationIds()).toEqual([]);
      expect(restarted.findByCorrelationKey('key')).toEqual({outcome: 'operation-not-found'});
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
});
