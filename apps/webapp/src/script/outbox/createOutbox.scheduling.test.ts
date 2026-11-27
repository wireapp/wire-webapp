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
import type {Kind} from './types';

describe('createOutbox scheduling', () => {
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

  function startedTexts(testKind: TestKind): string[] {
    return testKind.attempts.map(({operation}) => {
      return operation.payload.text;
    });
  }

  describe('expiry', () => {
    it('dead-letters a queued operation when it expires, by default', async () => {
      const testKind = await startWith({expiresAfterMilliseconds: 1_000});
      kit.outbox.pause();
      await enqueue(testKind, 'key');

      await kit.clock.advance(999);
      expect(testKind.operation('key').state).toBe('queued');
      await kit.clock.advance(1);

      expect(testKind.operation('key').state).toBe('dead-lettered');
      expect(triggersOf('operation-1').at(-1)).toBe('operation-expired');
    });

    it('drops a queued operation when it expires and the kind drops', async () => {
      const testKind = await startWith({expiresAfterMilliseconds: 1_000, whenGivenUp: 'drop'});
      kit.outbox.pause();
      await enqueue(testKind, 'key');

      await kit.clock.advance(1_000);

      expect(kit.outbox.findByCorrelationKey('key')).toEqual({outcome: 'operation-not-found'});
      expect(kit.store.operationIds()).toEqual([]);
      expect(testKind.changes.at(-1)).toMatchObject({state: 'dropped'});
    });

    it('dead-letters an operation on hold when it expires, by default', async () => {
      const testKind = await startWith({expiresAfterMilliseconds: 1_000});
      kit.outbox.pause();
      await enqueue(testKind, 'key');
      await kit.outbox.hold('key');

      await kit.clock.advance(1_000);

      expect(testKind.operation('key').state).toBe('dead-lettered');
    });

    it('drops an operation on hold when it expires and the kind drops', async () => {
      const testKind = await startWith({expiresAfterMilliseconds: 1_000, whenGivenUp: 'drop'});
      kit.outbox.pause();
      await enqueue(testKind, 'key');
      await kit.outbox.hold('key');

      await kit.clock.advance(1_000);

      expect(kit.outbox.findByCorrelationKey('key')).toEqual({outcome: 'operation-not-found'});
    });

    it('expires while the outbox was never resumed', async () => {
      const testKind = kit.registerKind({expiresAfterMilliseconds: 500});
      await kit.start({run: false});
      await enqueue(testKind, 'key');

      await kit.clock.advance(500);

      expect(testKind.operation('key').state).toBe('dead-lettered');
      expect(testKind.attempts).toHaveLength(0);
    });

    it('expires an operation that was loaded from the store when its time has come', async () => {
      const testKind = kit.registerKind();
      kit.store.seed(
        createStoredSnapshot({
          kind: testKind.kind.name,
          correlation: {state: 'correlated', correlationKey: 'key'},
          expiry: {state: 'expires-at', serverTime: 1_001_000},
        }),
      );
      await kit.start({run: false});
      expect(testKind.operation('key').state).toBe('queued');

      await kit.clock.advance(1_000);

      expect(testKind.operation('key').state).toBe('dead-lettered');
    });

    it('uses the expiry of the enqueue instead of the one of the kind', async () => {
      const testKind = await startWith({expiresAfterMilliseconds: 10_000});
      kit.outbox.pause();
      await kit.enqueue(testKind, {correlationKey: 'key', expiresAfterMilliseconds: 200});

      await kit.clock.advance(200);

      expect(testKind.operation('key').state).toBe('dead-lettered');
    });

    it('does not expire an operation without an expiry', async () => {
      const testKind = await startWith();
      kit.outbox.pause();
      await enqueue(testKind, 'key');

      await kit.clock.advance(365 * 24 * 3_600_000);

      expect(testKind.operation('key').state).toBe('queued');
    });

    it('does not abort an attempt that is running when it expires', async () => {
      const testKind = await startWith({expiresAfterMilliseconds: 1_000});
      await enqueue(testKind, 'key');
      const {signal} = testKind.lastAttempt();

      await kit.clock.advance(2_000);

      expect(signal.aborted).toBe(false);
      expect(testKind.operation('key').state).toBe('in-progress');
    });

    it('expires the operation when the attempt that was running at its expiry fails', async () => {
      const testKind = await startWith({expiresAfterMilliseconds: 1_000});
      await enqueue(testKind, 'key');
      await kit.clock.advance(2_000);

      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});

      expect(triggersOf('operation-1').slice(-2)).toEqual(['attempt-failed', 'operation-expired']);
      expect(testKind.operation('key').state).toBe('dead-lettered');
    });

    it('lets the operation succeed when the attempt that was running at its expiry succeeds', async () => {
      const testKind = await startWith({expiresAfterMilliseconds: 1_000});
      await enqueue(testKind, 'key');
      await kit.clock.advance(2_000);

      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});

      expect(testKind.changes.at(-1)).toMatchObject({state: 'succeeded'});
    });

    it('does not expire a dead-lettered operation again', async () => {
      const testKind = await startWith({expiresAfterMilliseconds: 1_000});
      await enqueue(testKind, 'key');
      await testKind.lastAttempt().answer({outcome: 'attempt-dead-lettered'});

      await kit.clock.advance(10_000);

      expect(triggersOf('operation-1').at(-1)).toBe('attempt-dead-lettered');
    });

    it('measures the expiry in server time: a server clock set back delays it', async () => {
      const testKind = await startWith({expiresAfterMilliseconds: 1_000});
      kit.outbox.pause();
      await enqueue(testKind, 'key');

      kit.clock.jumpServerTime(-500);
      await kit.clock.advance(1_000);
      expect(testKind.operation('key').state).toBe('queued');
      await kit.clock.advance(500);

      expect(testKind.operation('key').state).toBe('dead-lettered');
    });

    it('measures the expiry in server time: a server clock set forward expires the operation at the next look', async () => {
      const testKind = await startWith({expiresAfterMilliseconds: 10_000});
      kit.outbox.pause();
      await enqueue(testKind, 'key');

      kit.clock.jumpServerTime(10_000);
      await kit.enqueue(testKind, {correlationKey: 'other'});

      expect(testKind.operation('key').state).toBe('dead-lettered');
      expect(testKind.operation('other').state).toBe('queued');
    });

    it('stamps the snapshots with server time', async () => {
      const testKind = await startWith();
      kit.outbox.pause();
      kit.clock.jumpServerTime(5_000);

      await enqueue(testKind, 'key');

      expect(kit.store.history('operation-1')).toMatchObject([{at: 1_005_000, queuedAt: 1_005_000}]);
    });
  });

  describe('order', () => {
    it('starts the queued operations in the order they were enqueued', async () => {
      const testKind = await startWith();
      kit.outbox.pause();
      await enqueue(testKind, 'first');
      await enqueue(testKind, 'second');
      await enqueue(testKind, 'third');

      kit.outbox.resume();
      await kit.clock.settle();

      expect(startedTexts(testKind)).toEqual(['first', 'second', 'third']);
    });

    it('runs the operations without a lane next to each other', async () => {
      const testKind = await startWith();

      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');

      expect(startedTexts(testKind)).toEqual(['a', 'b']);
    });

    it('does not start anything while paused, and starts what is queued on resume', async () => {
      const testKind = await startWith();
      kit.outbox.pause();

      await enqueue(testKind, 'key');
      await kit.clock.advance(60_000);
      expect(testKind.attempts).toHaveLength(0);
      kit.outbox.resume();
      await kit.clock.settle();

      expect(testKind.attempts).toHaveLength(1);
    });

    it('does not abort a running attempt when paused, and holds back its retry until resumed', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');
      const {signal} = testKind.lastAttempt();

      kit.outbox.pause();
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
      await kit.clock.advance(60_000);

      expect(signal.aborted).toBe(false);
      expect(testKind.operation('key')).toMatchObject({state: 'queued', attempts: 1});
      expect(testKind.attempts).toHaveLength(1);

      kit.outbox.resume();
      await kit.clock.settle();

      expect(testKind.attempts).toHaveLength(2);
    });
  });

  describe('backoff', () => {
    it('waits 5 seconds before the first retry, then doubles up to 60 seconds', async () => {
      const testKind = await startWith({maxAttempts: 10});
      await enqueue(testKind, 'key');
      const waits: number[] = [];

      for (let retry = 0; retry < 6; retry++) {
        const attemptCount = testKind.attempts.length;
        await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
        let waited = 0;
        while (testKind.attempts.length === attemptCount) {
          await kit.clock.advance(1_000);
          waited += 1_000;
        }
        waits.push(waited);
      }

      expect(waits).toEqual([5_000, 10_000, 20_000, 40_000, 60_000, 60_000]);
    });

    it('waits a random time up to the limit: the source of randomness decides each wait', async () => {
      const testKind = await startWith({maxAttempts: 10});
      await enqueue(testKind, 'key');

      kit.random.queue(0.5);
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
      await kit.clock.advance(2_499);
      expect(testKind.attempts).toHaveLength(1);
      await kit.clock.advance(1);
      expect(testKind.attempts).toHaveLength(2);

      kit.random.queue(0.1);
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
      await kit.clock.advance(999);
      expect(testKind.attempts).toHaveLength(2);
      await kit.clock.advance(1);
      expect(testKind.attempts).toHaveLength(3);
    });

    it('may be no wait at all', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');

      kit.random.queue(0);
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
      await kit.clock.settle();

      expect(testKind.attempts).toHaveLength(2);
    });

    it.each(['attempt-failed', 'attempt-timed-out', 'attempt-errored'] as const)(
      'is started by %s, and holds back every operation',
      async trigger => {
        const testKind = await startWith({attemptTimeoutMilliseconds: 100});
        await enqueue(testKind, 'failing');
        if (trigger === 'attempt-failed') {
          await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
        } else if (trigger === 'attempt-errored') {
          await testKind.lastAttempt().reject(new Error('failed'));
        } else {
          await kit.clock.advance(100);
        }

        await enqueue(testKind, 'other');
        await kit.clock.advance(4_999);
        expect(testKind.attempts).toHaveLength(1);
        await kit.clock.advance(1);

        expect(startedTexts(testKind)).toEqual(['failing', 'failing', 'other']);
      },
    );

    it.each(['attempt-held', 'attempt-dead-lettered', 'attempt-dropped'] as const)(
      'is not started by %s',
      async outcome => {
        const testKind = await startWith();
        await enqueue(testKind, 'first');
        await testKind.lastAttempt().answer({outcome});

        await enqueue(testKind, 'second');

        expect(startedTexts(testKind)).toEqual(['first', 'second']);
      },
    );

    it('is not started when the last attempt gives up the operation', async () => {
      const testKind = await startWith({maxAttempts: 1});
      await enqueue(testKind, 'first');
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});

      await enqueue(testKind, 'second');

      expect(startedTexts(testKind)).toEqual(['first', 'second']);
    });

    it('resets on success', async () => {
      const testKind = await startWith({maxAttempts: 10});
      await enqueue(testKind, 'key');
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
      await kit.clock.advance(5_000);
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
      await kit.clock.advance(10_000);
      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});

      await enqueue(testKind, 'next');
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
      const attemptCount = testKind.attempts.length;
      await kit.clock.advance(5_000);

      expect(testKind.attempts).toHaveLength(attemptCount + 1);
    });

    it('resets on resume, which starts the waiting operation at once', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
      expect(testKind.attempts).toHaveLength(1);

      kit.outbox.pause();
      kit.outbox.resume();
      await kit.clock.settle();

      expect(testKind.attempts).toHaveLength(2);
    });

    it('is measured in stopwatch time: a server clock that jumps does not shorten or lengthen it', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});

      kit.clock.jumpServerTime(3_600_000);
      await kit.clock.advance(4_999);
      expect(testKind.attempts).toHaveLength(1);
      kit.clock.jumpServerTime(-7_200_000);
      await kit.clock.advance(1);

      expect(testKind.attempts).toHaveLength(2);
    });

    it('uses the configured minimum and maximum', async () => {
      kit = createOutboxTestKit({backoff: {minimumMilliseconds: 100, maximumMilliseconds: 250}});
      const testKind = await startWith({maxAttempts: 10});
      await enqueue(testKind, 'key');

      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
      await kit.clock.advance(100);
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
      await kit.clock.advance(199);
      expect(testKind.attempts).toHaveLength(2);
      await kit.clock.advance(1);
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
      await kit.clock.advance(250);

      expect(testKind.attempts).toHaveLength(4);
    });

    it('does not delay the expiry of an operation that waits behind it', async () => {
      const testKind = await startWith({maxAttempts: 10});
      await enqueue(testKind, 'failing');
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
      await kit.enqueue(testKind, {correlationKey: 'expiring', expiresAfterMilliseconds: 2_000});

      await kit.clock.advance(2_000);

      expect(testKind.operation('expiring').state).toBe('dead-lettered');
      expect(testKind.attempts).toHaveLength(1);
    });
  });

  describe('wake timers', () => {
    it('has no timer while nothing is waiting for a time', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');
      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});

      expect(kit.clock.pendingTimers()).toEqual([]);
    });

    it('wakes for the expiry of a queued operation', async () => {
      const testKind = await startWith({expiresAfterMilliseconds: 1_000});
      kit.outbox.pause();

      await enqueue(testKind, 'key');

      expect(kit.clock.pendingTimers()).toEqual([{id: expect.any(Number), dueInMilliseconds: 1_000}]);
    });

    it('wakes for the soonest expiry only', async () => {
      const testKind = await startWith();
      kit.outbox.pause();
      await kit.enqueue(testKind, {correlationKey: 'late', expiresAfterMilliseconds: 5_000});
      await kit.enqueue(testKind, {correlationKey: 'soon', expiresAfterMilliseconds: 2_000});

      expect(kit.clock.pendingTimers()).toEqual([{id: expect.any(Number), dueInMilliseconds: 2_000}]);

      await kit.clock.advance(2_000);

      expect(kit.clock.pendingTimers()).toEqual([{id: expect.any(Number), dueInMilliseconds: 3_000}]);
    });

    it('wakes in the time that is left of an expiry in server time', async () => {
      const testKind = await startWith({expiresAfterMilliseconds: 10_000});
      kit.outbox.pause();
      await enqueue(testKind, 'key');

      kit.clock.jumpServerTime(4_000);
      await kit.enqueue(testKind, {correlationKey: 'other'});

      expect(kit.clock.pendingTimers()).toEqual([{id: expect.any(Number), dueInMilliseconds: 6_000}]);
    });

    it('wakes for the end of the backoff when an operation is waiting for it', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');

      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});

      expect(kit.clock.pendingTimers()).toEqual([{id: expect.any(Number), dueInMilliseconds: 5_000}]);
    });

    it('does not wake for the end of the backoff when no operation is waiting for it', async () => {
      const testKind = await startWith({maxAttempts: 1});
      await enqueue(testKind, 'key');

      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});

      expect(kit.clock.pendingTimers()).toEqual([]);
    });

    it('wakes for the soonest of the backoff and an expiry', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'failing');
      await kit.enqueue(testKind, {correlationKey: 'expiring', expiresAfterMilliseconds: 2_000});

      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});

      expect(kit.clock.pendingTimers()).toEqual([{id: expect.any(Number), dueInMilliseconds: 2_000}]);
    });

    it('does nothing at the end of the backoff when paused meanwhile, and starts at once on resume', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});

      kit.outbox.pause();
      await kit.clock.advance(5_000);
      expect(testKind.attempts).toHaveLength(1);
      kit.outbox.resume();
      await kit.clock.settle();

      expect(testKind.attempts).toHaveLength(2);
    });

    it('arms the timeout of an attempt, and clears it when the attempt answers', async () => {
      const testKind = await startWith({attemptTimeoutMilliseconds: 1_000});
      await enqueue(testKind, 'key');
      expect(kit.clock.pendingTimers()).toEqual([{id: expect.any(Number), dueInMilliseconds: 1_000}]);

      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});

      expect(kit.clock.pendingTimers()).toEqual([]);
    });

    it('wakes in two steps for a delay longer than a timer can hold', async () => {
      const testKind = await startWith({expiresAfterMilliseconds: 3_000_000_000});
      kit.outbox.pause();
      await enqueue(testKind, 'key');
      expect(kit.clock.pendingTimers()).toEqual([{id: expect.any(Number), dueInMilliseconds: 2_147_483_647}]);

      await kit.clock.advance(2_147_483_647);

      expect(testKind.operation('key').state).toBe('queued');
      expect(kit.clock.pendingTimers()).toEqual([{id: expect.any(Number), dueInMilliseconds: 852_516_353}]);

      await kit.clock.advance(852_516_353);

      expect(testKind.operation('key').state).toBe('dead-lettered');
    });

    it.each(['an expiry', 'the backoff', 'an attempt timeout'] as const)(
      'has no timer left after stop, with %s pending',
      async pending => {
        const testKind = await startWith({
          expiresAfterMilliseconds: pending === 'an expiry' ? 1_000 : undefined,
          attemptTimeoutMilliseconds: pending === 'an attempt timeout' ? 1_000 : undefined,
        });
        if (pending === 'an expiry') {
          kit.outbox.pause();
        }
        await enqueue(testKind, 'key');
        if (pending === 'the backoff') {
          await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
        }
        expect(kit.clock.pendingTimers()).toHaveLength(1);

        await kit.outbox.stop();

        expect(kit.clock.pendingTimers()).toEqual([]);
      },
    );

    it('starts and expires nothing after stop', async () => {
      const testKind = await startWith({expiresAfterMilliseconds: 10_000});
      await enqueue(testKind, 'key');
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});

      await kit.outbox.stop();
      await kit.clock.advance(60_000);

      expect(testKind.attempts).toHaveLength(1);
      expect(triggersOf('operation-1')).toEqual(['operation-queued', 'attempt-started', 'attempt-failed']);
    });
  });
});
