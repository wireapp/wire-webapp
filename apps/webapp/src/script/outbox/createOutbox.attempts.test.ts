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

import {createOutboxTestKit, createStoredSnapshot, type OutboxTestKit} from './testing/createOutboxTestKit';
import type {AttemptOutcome} from './types';

describe('createOutbox attempts', () => {
  let kit: OutboxTestKit;

  beforeEach(() => {
    kit = createOutboxTestKit();
  });

  function triggersOf(operationId: string): string[] {
    return kit.store.history(operationId).map(({trigger}) => {
      return trigger;
    });
  }

  describe('an attempt answering', () => {
    it('attempt-succeeded forgets the operation', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});

      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});

      expect(kit.outbox.findByCorrelationKey('key')).toEqual({outcome: 'operation-not-found'});
      expect(kit.store.operationIds()).toEqual([]);
      expect(
        testKind.changes.map(({state}) => {
          return state;
        }),
      ).toEqual(['queued', 'in-progress', 'succeeded']);
    });

    it('attempt-succeeded lets the next attempt start at once after earlier failures', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'first'});
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
      await kit.clock.advance(5_000);
      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});

      await kit.enqueue(testKind, {correlationKey: 'second'});

      expect(testKind.attempts).toHaveLength(3);
    });

    it('attempt-failed queues the operation again, and the attempt count stays', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});

      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});

      expect(kit.operation('key')).toMatchObject({state: 'queued', attempts: 1});
      expect(triggersOf('operation-1')).toEqual(['operation-queued', 'attempt-started', 'attempt-failed']);
    });

    it('attempt-failed makes the next attempt start after the backoff, with its attempt count raised', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});

      await kit.clock.advance(4_999);
      expect(testKind.attempts).toHaveLength(1);
      await kit.clock.advance(1);

      expect(testKind.attempts).toHaveLength(2);
      expect(testKind.lastAttempt().operation).toMatchObject({state: 'in-progress', attempts: 2});
    });

    it('attempt-held puts the operation on hold, recording attempt-held', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});

      await testKind.lastAttempt().answer({outcome: 'attempt-held'});

      expect(kit.operation('key')).toMatchObject({state: 'on-hold', attempts: 1});
      expect(kit.store.history('operation-1').at(-1)).toMatchObject({trigger: 'attempt-held', state: 'on-hold'});
      expect(
        testKind.changes.map(({state}) => {
          return state;
        }),
      ).toEqual(['queued', 'in-progress', 'on-hold']);
    });

    it('attempt-dead-lettered keeps the operation dead-lettered and never retries it', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});

      await testKind.lastAttempt().answer({outcome: 'attempt-dead-lettered'});
      await kit.clock.advance(120_000);

      expect(kit.operation('key')).toMatchObject({state: 'dead-lettered', attempts: 1});
      expect(kit.store.history('operation-1').at(-1)).toMatchObject({trigger: 'attempt-dead-lettered'});
      expect(testKind.attempts).toHaveLength(1);
    });

    it('attempt-dead-lettered dead-letters even when the kind drops what it gives up', async () => {
      const testKind = kit.registerKind({whenGivenUp: 'drop'});
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});

      await testKind.lastAttempt().answer({outcome: 'attempt-dead-lettered'});

      expect(kit.operation('key').state).toBe('dead-lettered');
    });

    it('attempt-dropped forgets the operation, recording attempt-dropped', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});

      await testKind.lastAttempt().answer({outcome: 'attempt-dropped'});

      expect(kit.outbox.findByCorrelationKey('key')).toEqual({outcome: 'operation-not-found'});
      expect(kit.store.operationIds()).toEqual([]);
      expect(testKind.changes.at(-1)).toMatchObject({state: 'dropped'});
    });

    it.each<[string, AttemptOutcome]>([
      ['attempt-dead-lettered', {outcome: 'attempt-dead-lettered'}],
      ['attempt-dropped', {outcome: 'attempt-dropped'}],
    ])('%s lets the next operation of the lane run', async (_, answer) => {
      const testKind = kit.registerKind();
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'first', laneKey: 'lane'});
      await kit.enqueue(testKind, {correlationKey: 'second', laneKey: 'lane'});

      await testKind.lastAttempt().answer(answer);

      expect(
        testKind.attempts.map(({operation}) => {
          return operation.id;
        }),
      ).toEqual(['operation-1', 'operation-2']);
    });
  });

  describe('an attempt errored', () => {
    it('by a rejection is retried after the backoff, recording attempt-errored', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});

      await testKind.lastAttempt().reject(new RangeError('boom'));

      expect(kit.operation('key')).toMatchObject({state: 'queued', attempts: 1});
      expect(kit.store.history('operation-1').at(-1)).toMatchObject({trigger: 'attempt-errored'});
      expect(kit.logger.entriesOf('Attempt errored')).toEqual([
        {level: 'warn', message: 'Attempt errored', attributes: {kind: testKind.kind.name, errorName: 'RangeError'}},
      ]);
      await kit.clock.advance(5_000);
      expect(testKind.attempts).toHaveLength(2);
    });

    it('by a throw is treated like a rejection', async () => {
      const testKind = kit.registerKind({
        attempt: () => {
          throw new TypeError('boom');
        },
      });
      await kit.start();

      await kit.enqueue(testKind, {correlationKey: 'key'});

      expect(kit.operation('key')).toMatchObject({state: 'queued', attempts: 1});
      expect(kit.store.history('operation-1').at(-1)).toMatchObject({trigger: 'attempt-errored'});
      expect(kit.logger.entriesOf('Attempt errored')).toMatchObject([{attributes: {errorName: 'TypeError'}}]);
    });

    it.each([undefined, null, 'attempt-succeeded', {outcome: 'attempt-unknown'}, {}])(
      'by the unknown answer %p is treated like a rejection',
      async unknown => {
        const testKind = kit.registerKind({
          attempt: async () => {
            return unknown as AttemptOutcome;
          },
        });
        await kit.start();

        await kit.enqueue(testKind, {correlationKey: 'key'});

        expect(kit.operation('key').state).toBe('queued');
        expect(kit.store.history('operation-1').at(-1)).toMatchObject({trigger: 'attempt-errored'});
        expect(kit.logger.entriesOf('Attempt errored')).toMatchObject([{attributes: {errorName: 'UnknownAnswer'}}]);
      },
    );

    it('by the rejection of an aborted attempt is not logged', async () => {
      const testKind = kit.registerKind({attemptTimeoutMilliseconds: 1_000});
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});
      await kit.clock.advance(1_000);

      await testKind.lastAttempt().reject(new Error('aborted'));

      expect(kit.logger.entriesOf('Attempt errored')).toEqual([]);
      expect(kit.store.history('operation-1').at(-1)).toMatchObject({trigger: 'attempt-timed-out'});
    });
  });

  describe('the attempt timeout', () => {
    it('aborts the attempt after the kind limit and records attempt-timed-out', async () => {
      const testKind = kit.registerKind({attemptTimeoutMilliseconds: 1_000});
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});
      const {signal} = testKind.lastAttempt();

      await kit.clock.advance(999);
      expect(signal.aborted).toBe(false);
      expect(kit.operation('key').state).toBe('in-progress');
      await kit.clock.advance(1);

      expect(signal.aborted).toBe(true);
      expect(kit.operation('key')).toMatchObject({state: 'queued', attempts: 1});
      expect(kit.store.history('operation-1').at(-1)).toMatchObject({trigger: 'attempt-timed-out'});
    });

    it('is measured in stopwatch time, not server time', async () => {
      const testKind = kit.registerKind({attemptTimeoutMilliseconds: 1_000});
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});

      kit.clock.jumpServerTime(60_000);
      await kit.clock.settle();

      expect(testKind.lastAttempt().signal.aborted).toBe(false);
      expect(kit.operation('key').state).toBe('in-progress');
    });

    it('takes the limit of the enqueue over the one of the kind', async () => {
      const testKind = kit.registerKind({attemptTimeoutMilliseconds: 10_000});
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key', attemptTimeoutMilliseconds: 1_000});

      await kit.clock.advance(1_000);

      expect(testKind.lastAttempt().signal.aborted).toBe(true);
    });

    it('is retried after the backoff like a failure', async () => {
      const testKind = kit.registerKind({attemptTimeoutMilliseconds: 1_000});
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});
      await kit.clock.advance(1_000);

      await kit.clock.advance(5_000);

      expect(testKind.attempts).toHaveLength(2);
    });

    it('ignores an answer that comes after the timeout', async () => {
      const testKind = kit.registerKind({attemptTimeoutMilliseconds: 1_000, maxAttempts: 2});
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});
      await kit.clock.advance(1_000);

      await testKind.attempts[0].answer({outcome: 'attempt-succeeded'});

      expect(kit.operation('key').state).toBe('queued');
      expect(triggersOf('operation-1')).toEqual(['operation-queued', 'attempt-started', 'attempt-timed-out']);
    });

    it('is cleared when the attempt answers first', async () => {
      const testKind = kit.registerKind({attemptTimeoutMilliseconds: 1_000});
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});

      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});

      expect(kit.clock.pendingTimers()).toEqual([]);
    });

    it('does not limit an attempt of a kind without a limit', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});

      await kit.clock.advance(3_600_000);

      expect(kit.operation('key').state).toBe('in-progress');
    });
  });

  describe('giving up', () => {
    async function failAttempts(count: number, testKind: ReturnType<OutboxTestKit['registerKind']>): Promise<void> {
      for (let index = 0; index < count; index++) {
        await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
        await kit.clock.advance(60_000);
      }
    }

    it('dead-letters the operation after five failed attempts by default', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});

      await failAttempts(4, testKind);
      expect(kit.operation('key')).toMatchObject({state: 'in-progress', attempts: 5});
      await failAttempts(1, testKind);

      expect(kit.operation('key')).toMatchObject({state: 'dead-lettered', attempts: 5});
      expect(testKind.attempts).toHaveLength(5);
    });

    it('gives up after the kind maxAttempts', async () => {
      const testKind = kit.registerKind({maxAttempts: 2});
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});

      await failAttempts(2, testKind);

      expect(kit.operation('key')).toMatchObject({state: 'dead-lettered', attempts: 2});
      expect(testKind.attempts).toHaveLength(2);
    });

    it.each([
      [
        'a failure',
        async (testKind: ReturnType<OutboxTestKit['registerKind']>) => {
          await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
        },
        'attempt-failed',
      ],
      [
        'an error',
        async (testKind: ReturnType<OutboxTestKit['registerKind']>) => {
          await testKind.lastAttempt().reject(new Error('boom'));
        },
        'attempt-errored',
      ],
    ])('dead-letters the operation at the last attempt ending in %s', async (_, end, trigger) => {
      const testKind = kit.registerKind({maxAttempts: 1});
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});

      await end(testKind);

      expect(kit.operation('key').state).toBe('dead-lettered');
      expect(kit.store.history('operation-1').at(-1)).toMatchObject({trigger, state: 'dead-lettered'});
    });

    it('dead-letters the operation at the last attempt ending in a timeout', async () => {
      const testKind = kit.registerKind({maxAttempts: 1, attemptTimeoutMilliseconds: 1_000});
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});

      await kit.clock.advance(1_000);

      expect(kit.store.history('operation-1').at(-1)).toMatchObject({
        trigger: 'attempt-timed-out',
        state: 'dead-lettered',
      });
    });

    it('drops the operation when the kind drops what it gives up', async () => {
      const testKind = kit.registerKind({maxAttempts: 1, whenGivenUp: 'drop'});
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});

      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});

      expect(kit.outbox.findByCorrelationKey('key')).toEqual({outcome: 'operation-not-found'});
      expect(kit.store.operationIds()).toEqual([]);
      expect(testKind.changes.at(-1)).toMatchObject({state: 'dropped'});
    });

    it('does not retry a dead-lettered operation, and lets its lane carry on', async () => {
      const testKind = kit.registerKind({maxAttempts: 1});
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'first', laneKey: 'lane'});
      await kit.enqueue(testKind, {correlationKey: 'second', laneKey: 'lane'});

      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
      await kit.clock.advance(60_000);

      expect(
        testKind.attempts.map(({operation}) => {
          return operation.id;
        }),
      ).toEqual(['operation-1', 'operation-2']);
    });

    it('counts attempts from the last version', async () => {
      const testKind = kit.registerKind({maxAttempts: 1});
      await kit.start({run: false});
      await kit.enqueue(testKind, {correlationKey: 'key'});
      kit.outbox.resume();
      await kit.clock.settle();
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
      kit.outbox.pause();

      await kit.enqueue(testKind, {correlationKey: 'key', payload: {text: 'again'}});
      kit.outbox.resume();
      await kit.clock.settle();

      expect(testKind.lastAttempt().operation).toMatchObject({payload: {text: 'again'}, attempts: 1});
    });
  });

  describe('an attempt-held operation', () => {
    async function startWithHeld(): Promise<ReturnType<OutboxTestKit['registerKind']>> {
      const testKind = kit.registerKind();
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'a', laneKey: 'lane'});
      await testKind.lastAttempt().answer({outcome: 'attempt-held'});
      return testKind;
    }

    it('is not attempted again until released', async () => {
      const testKind = await startWithHeld();

      await kit.clock.advance(120_000);

      expect(testKind.attempts).toHaveLength(1);
    });

    it('is attempted again at once when released, because a hold is not a failure and does not grow the backoff', async () => {
      const testKind = await startWithHeld();

      expect(await kit.outbox.release('a')).toMatchObject({outcome: 'operation-released'});
      await kit.clock.settle();

      expect(testKind.attempts).toHaveLength(2);
      expect(testKind.lastAttempt().operation).toMatchObject({attempts: 2});
    });

    it('does not make other operations wait for a backoff', async () => {
      const testKind = await startWithHeld();

      await kit.enqueue(testKind, {correlationKey: 'b'});

      expect(
        testKind.attempts.map(({operation}) => {
          return operation.id;
        }),
      ).toEqual(['operation-1', 'operation-2']);
    });

    it('blocks its lane, and leaves other lanes and operations without a lane alone', async () => {
      const testKind = await startWithHeld();
      await kit.enqueue(testKind, {correlationKey: 'behind', laneKey: 'lane'});
      await kit.enqueue(testKind, {correlationKey: 'elsewhere', laneKey: 'other-lane'});
      await kit.enqueue(testKind, {correlationKey: 'free'});

      expect(kit.lane('lane')).toMatchObject({
        state: 'blocked',
        operations: [{id: 'operation-1'}, {id: 'operation-2'}],
      });
      expect(
        testKind.attempts.map(({operation}) => {
          return operation.id;
        }),
      ).toEqual(['operation-1', 'operation-3', 'operation-4']);
    });

    it('lets the operation behind it run once it was released and succeeded', async () => {
      const testKind = await startWithHeld();
      await kit.enqueue(testKind, {correlationKey: 'behind', laneKey: 'lane'});

      await kit.outbox.release('a');
      await kit.clock.settle();
      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});

      expect(testKind.lastAttempt().operation).toMatchObject({id: 'operation-2'});
    });

    it('stays on hold after a reload, and nothing is attempted', async () => {
      const testKind = await startWithHeld();
      await kit.outbox.stop();

      await kit.start();

      expect(testKind.operation('a').state).toBe('on-hold');
      expect(testKind.attempts).toHaveLength(1);
      expect(kit.lane('lane').state).toBe('blocked');
    });
  });

  describe('an attempt interrupted by a reload', () => {
    it('is retried with its attempt count raised', async () => {
      const testKind = kit.registerKind();
      kit.store.seed(
        createStoredSnapshot({
          kind: testKind.kind.name,
          correlation: {state: 'correlated', correlationKey: 'key'},
          state: 'in-progress',
          attempts: 1,
        }),
      );

      await kit.start();

      expect(testKind.lastAttempt().operation).toMatchObject({id: 'stored-operation', attempts: 2});
    });
  });
});
