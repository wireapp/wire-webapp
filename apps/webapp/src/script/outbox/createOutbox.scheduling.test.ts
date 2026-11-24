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

import {createOutboxTestKit, type OutboxTestKit, type TestKind} from './testing/createOutboxTestKit';
import type {Kind} from './types';

describe('createOutbox scheduling', () => {
  let kit: OutboxTestKit;

  beforeEach(() => {
    kit = createOutboxTestKit();
  });

  afterEach(() => {
    kit.dispose();
  });

  async function startWith(overrides: Partial<Kind<{text: string}>> = {}): Promise<TestKind> {
    const testKind = kit.registerKind(overrides);
    await kit.start();
    return testKind;
  }

  async function enqueue(testKind: TestKind, correlationKey: string, orderingKey?: string): Promise<string> {
    const outcome = await kit.enqueue(testKind, {payload: {text: correlationKey}, correlationKey, orderingKey});
    return outcome.type === 'operation-queued' ? outcome.operation.id : '';
  }

  function historyOf(id: string): string[] {
    return kit.store.history(id).map(({trigger, state}) => {
      return `${trigger}>${state}`;
    });
  }

  describe('how an attempt ends', () => {
    it('succeeds: the operation is deleted, and onChanged hears it', async () => {
      const testKind = await startWith();
      const id = await enqueue(testKind, 'key');

      await testKind.lastPerform().answer({type: 'attempt-succeeded'});

      expect(testKind.operation('key')).toBeUndefined();
      expect(kit.store.operationIds()).toEqual([]);
      expect(kit.store.history(id)).toEqual([]);
      expect(
        testKind.changes.map(({state}) => {
          return state;
        }),
      ).toEqual(['queued', 'in-progress', 'succeeded']);
    });

    it('appends the final snapshot before it deletes the operation', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');
      const callsBefore = kit.store.calls.length;

      await testKind.lastPerform().answer({type: 'attempt-succeeded'});

      expect(kit.store.calls.slice(callsBefore)).toEqual([
        {method: 'append', snapshot: expect.objectContaining({trigger: 'attempt-succeeded', state: 'succeeded'})},
        {method: 'remove', operationIds: [expect.any(String)]},
      ]);
    });

    it('does not delete the operation when its final snapshot cannot be appended', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');
      kit.store.fail('append', true);

      await kit.outbox.drop('key');

      expect(
        kit.store.calls.filter(({method}) => {
          return method === 'remove';
        }),
      ).toEqual([]);
      expect(testKind.operation('key')?.state).toBe('in-progress');
    });

    it('records the attempt started, and gives perform the operation with its attempts', async () => {
      const testKind = await startWith();
      const id = await enqueue(testKind, 'key');

      expect(historyOf(id)).toEqual(['operation-queued>queued', 'attempt-started>in-progress']);
      expect(testKind.lastPerform().operation).toMatchObject({
        id,
        kind: testKind.kind.name,
        payload: {text: 'key'},
        correlationKey: 'key',
        state: 'in-progress',
        attempts: 1,
      });
    });

    it('fails: the operation is queued again and records attempt-failed', async () => {
      const testKind = await startWith();
      const id = await enqueue(testKind, 'key');

      await testKind.lastPerform().answer({type: 'attempt-failed'});

      expect(testKind.operation('key')).toMatchObject({state: 'queued', attempts: 1});
      expect(historyOf(id).at(-1)).toBe('attempt-failed>queued');
    });

    it('is dead-lettered by perform: kept, with the trigger dead-lettered', async () => {
      const testKind = await startWith();
      const id = await enqueue(testKind, 'key');

      await testKind.lastPerform().answer({type: 'operation-dead-lettered'});

      expect(testKind.operation('key')?.state).toBe('dead-lettered');
      expect(historyOf(id).at(-1)).toBe('operation-dead-lettered>dead-lettered');
    });

    it('is dropped by perform: deleted', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');

      await testKind.lastPerform().answer({type: 'operation-dropped'});

      expect(testKind.operation('key')).toBeUndefined();
      expect(kit.store.operationIds()).toEqual([]);
      expect(testKind.changes.at(-1)?.state).toBe('dropped');
    });

    it('errors when perform rejects, and logs only the error name', async () => {
      const testKind = await startWith();
      const id = await enqueue(testKind, 'key');

      await testKind.lastPerform().reject(new RangeError('contains secret'));

      expect(testKind.operation('key')?.state).toBe('queued');
      expect(historyOf(id).at(-1)).toBe('attempt-errored>queued');
      expect(kit.logger.entriesOf('Attempt errored')[0].attributes).toMatchObject({errorName: 'RangeError'});
      expect(JSON.stringify(kit.logger.entries)).not.toContain('secret');
    });

    it.each(['drop', 'timeout', 'stop'] as const)(
      'does not log an attempt that rejects after it was aborted by a %s',
      async cause => {
        const testKind = await startWith({performTimeoutMilliseconds: 1_000});
        await enqueue(testKind, 'key');
        const attempt = testKind.lastPerform();

        if (cause === 'drop') {
          await kit.outbox.drop('key');
        } else if (cause === 'timeout') {
          await kit.clock.advance(1_000);
        } else {
          await kit.outbox.stop();
        }
        await attempt.reject(new DOMException('aborted', 'AbortError'));

        expect(kit.logger.entriesOf('Attempt errored')).toEqual([]);
      },
    );

    it('errors when perform throws', async () => {
      const testKind = await startWith({
        perform: () => {
          throw new TypeError('thrown');
        },
      });

      const id = await enqueue(testKind, 'key');

      expect(historyOf(id)).toEqual([
        'operation-queued>queued',
        'attempt-started>in-progress',
        'attempt-errored>queued',
      ]);
    });

    it('errors when perform answers something that is not an outcome', async () => {
      const testKind = await startWith({
        perform: async () => {
          return {type: 'nonsense'} as never;
        },
      });

      const id = await enqueue(testKind, 'key');

      expect(historyOf(id).at(-1)).toBe('attempt-errored>queued');
    });

    it('times out after the performTimeout of the kind, and aborts perform', async () => {
      const testKind = await startWith({performTimeoutMilliseconds: 1_000});
      const id = await enqueue(testKind, 'key');
      const {signal} = testKind.lastPerform();

      await kit.clock.advance(999);
      expect(signal.aborted).toBe(false);
      await kit.clock.advance(1);

      expect(signal.aborted).toBe(true);
      expect(historyOf(id).at(-1)).toBe('attempt-timed-out>queued');
    });

    it('times out after the timeout of the enqueue, which overrides the kind', async () => {
      const testKind = await startWith({performTimeoutMilliseconds: 10_000});
      await kit.enqueue(testKind, {correlationKey: 'key', performTimeoutMilliseconds: 200});

      await kit.clock.advance(200);

      expect(testKind.operation('key')).toMatchObject({state: 'queued', attempts: 1});
    });

    it('ignores what perform answers after the timeout', async () => {
      const testKind = await startWith({performTimeoutMilliseconds: 1_000});
      const id = await enqueue(testKind, 'key');
      const attempt = testKind.lastPerform();
      await kit.clock.advance(1_000);

      await attempt.answer({type: 'attempt-succeeded'});

      expect(historyOf(id).at(-1)).toBe('attempt-timed-out>queued');
    });

    it('does not time out without a timeout', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');

      await kit.clock.advance(3_600_000);

      expect(testKind.operation('key')?.state).toBe('in-progress');
    });

    it('does not time out once perform answered', async () => {
      const testKind = await startWith({performTimeoutMilliseconds: 1_000});
      const id = await enqueue(testKind, 'key');
      await testKind.lastPerform().answer({type: 'attempt-failed'});

      await kit.clock.advance(1_000);

      expect(
        historyOf(id).filter(entry => {
          return entry.startsWith('attempt-timed-out');
        }),
      ).toEqual([]);
    });
  });

  describe('giving up', () => {
    it.each(['attempt-failed', 'attempt-timed-out', 'attempt-errored'] as const)(
      'retries %s until maxAttempts, then dead-letters by default',
      async trigger => {
        const testKind = await startWith({maxAttempts: 2, ...timeoutFor(trigger)});
        const id = await enqueue(testKind, 'key');

        for (let attempt = 1; attempt <= 2; attempt++) {
          await endAttempt(testKind, trigger);
          await kit.clock.advance(60_000);
        }

        expect(testKind.performs).toHaveLength(2);
        expect(testKind.operation('key')).toMatchObject({state: 'dead-lettered', attempts: 2});
        expect(historyOf(id).at(-1)).toBe(`${trigger}>dead-lettered`);
      },
    );

    it.each(['attempt-failed', 'attempt-timed-out', 'attempt-errored'] as const)(
      'retries %s until maxAttempts, then drops when the kind drops',
      async trigger => {
        const testKind = await startWith({maxAttempts: 2, whenGivenUp: 'drop', ...timeoutFor(trigger)});
        await enqueue(testKind, 'key');

        for (let attempt = 1; attempt <= 2; attempt++) {
          await endAttempt(testKind, trigger);
          await kit.clock.advance(60_000);
        }

        expect(testKind.performs).toHaveLength(2);
        expect(testKind.operation('key')).toBeUndefined();
        expect(kit.store.operationIds()).toEqual([]);
      },
    );

    it('tries 5 times by default', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');

      for (let attempt = 1; attempt <= 5; attempt++) {
        await testKind.lastPerform().answer({type: 'attempt-failed'});
        await kit.clock.advance(60_000);
      }

      expect(testKind.performs).toHaveLength(5);
      expect(testKind.operation('key')?.state).toBe('dead-lettered');
    });

    function timeoutFor(trigger: string): Partial<Kind<{text: string}>> {
      return trigger === 'attempt-timed-out' ? {performTimeoutMilliseconds: 100} : {};
    }

    async function endAttempt(
      testKind: TestKind,
      trigger: 'attempt-failed' | 'attempt-timed-out' | 'attempt-errored',
    ): Promise<void> {
      if (trigger === 'attempt-failed') {
        await testKind.lastPerform().answer({type: 'attempt-failed'});
      } else if (trigger === 'attempt-errored') {
        await testKind.lastPerform().reject(new Error('failed'));
      } else {
        await kit.clock.advance(100);
      }
    }
  });

  describe('expiry', () => {
    it('dead-letters a queued operation when it expires, by default', async () => {
      const testKind = await startWith({expiresAfterMilliseconds: 1_000});
      kit.outbox.pause();
      const id = await enqueue(testKind, 'key');

      await kit.clock.advance(999);
      expect(testKind.operation('key')?.state).toBe('queued');
      await kit.clock.advance(1);

      expect(testKind.operation('key')?.state).toBe('dead-lettered');
      expect(historyOf(id).at(-1)).toBe('operation-expired>dead-lettered');
    });

    it('drops a queued operation when it expires and the kind drops', async () => {
      const testKind = await startWith({expiresAfterMilliseconds: 1_000, whenGivenUp: 'drop'});
      kit.outbox.pause();
      await enqueue(testKind, 'key');

      await kit.clock.advance(1_000);

      expect(testKind.operation('key')).toBeUndefined();
      expect(kit.store.operationIds()).toEqual([]);
    });

    it.each([
      ['dead-letter', 'dead-lettered'],
      ['drop', undefined],
    ] as const)('gives up an operation on hold when it expires and the kind says %s', async (whenGivenUp, state) => {
      const testKind = await startWith({expiresAfterMilliseconds: 1_000, whenGivenUp});
      kit.outbox.pause();
      await enqueue(testKind, 'key');
      await kit.outbox.hold('key');

      await kit.clock.advance(1_000);

      expect(testKind.operation('key')?.state).toBe(state);
    });

    it('expires while the outbox is paused or not yet resumed', async () => {
      const testKind = kit.registerKind({expiresAfterMilliseconds: 500});
      await kit.start({run: false});
      await enqueue(testKind, 'key');

      await kit.clock.advance(500);

      expect(testKind.operation('key')?.state).toBe('dead-lettered');
    });

    it('does not abort an attempt that is running when it expires, and expires the operation if the attempt fails', async () => {
      const testKind = await startWith({expiresAfterMilliseconds: 1_000});
      const id = await enqueue(testKind, 'key');
      const {signal} = testKind.lastPerform();

      await kit.clock.advance(2_000);
      expect(signal.aborted).toBe(false);
      expect(testKind.operation('key')?.state).toBe('in-progress');
      await testKind.lastPerform().answer({type: 'attempt-failed'});
      await kit.clock.settle();

      expect(historyOf(id).slice(-2)).toEqual(['attempt-failed>queued', 'operation-expired>dead-lettered']);
    });

    it('does not expire a dead-lettered operation again', async () => {
      const testKind = await startWith({expiresAfterMilliseconds: 1_000});
      const id = await enqueue(testKind, 'key');
      await testKind.lastPerform().answer({type: 'operation-dead-lettered'});

      await kit.clock.advance(10_000);

      expect(historyOf(id).at(-1)).toBe('operation-dead-lettered>dead-lettered');
    });

    it('measures the expiry in server time', async () => {
      const testKind = await startWith({expiresAfterMilliseconds: 1_000});
      kit.outbox.pause();
      await enqueue(testKind, 'key');

      kit.clock.jumpServerTime(-500);
      await kit.clock.advance(1_000);
      expect(testKind.operation('key')?.state).toBe('queued');
      await kit.clock.advance(500);

      expect(testKind.operation('key')?.state).toBe('dead-lettered');
    });
  });

  describe('order', () => {
    it('runs the operations of a lane one after another, in queue order', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'first', 'lane');
      await enqueue(testKind, 'second', 'lane');
      await enqueue(testKind, 'third', 'lane');
      expect(
        testKind.performs.map(({operation}) => {
          return operation.payload.text;
        }),
      ).toEqual(['first']);

      await testKind.performs[0].answer({type: 'attempt-succeeded'});
      expect(
        testKind.performs.map(({operation}) => {
          return operation.payload.text;
        }),
      ).toEqual(['first', 'second']);

      await testKind.performs[1].answer({type: 'attempt-succeeded'});
      expect(
        testKind.performs.map(({operation}) => {
          return operation.payload.text;
        }),
      ).toEqual(['first', 'second', 'third']);
    });

    it('runs the lanes next to each other, and operations without a key next to everything', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'a', 'lane-a');
      await enqueue(testKind, 'b', 'lane-b');
      await enqueue(testKind, 'c');
      await enqueue(testKind, 'd');

      expect(
        testKind.performs
          .map(({operation}) => {
            return operation.payload.text;
          })
          .sort(),
      ).toEqual(['a', 'b', 'c', 'd']);
    });

    it('keeps the first operation of a lane first while it waits for its retry', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'first', 'lane');
      await enqueue(testKind, 'second', 'lane');

      await testKind.performs[0].answer({type: 'attempt-failed'});
      await kit.clock.advance(4_999);
      expect(testKind.performs).toHaveLength(1);
      await kit.clock.advance(1);

      expect(
        testKind.performs.map(({operation}) => {
          return operation.payload.text;
        }),
      ).toEqual(['first', 'first']);
    });

    it('is blocked by an operation on hold, until it is released', async () => {
      const testKind = await startWith();
      kit.outbox.pause();
      await enqueue(testKind, 'first', 'lane');
      await enqueue(testKind, 'second', 'lane');
      await kit.outbox.hold('first');

      kit.outbox.resume();
      await kit.clock.settle();
      expect(testKind.performs).toHaveLength(0);
      await kit.outbox.release('first');
      await kit.clock.settle();

      expect(
        testKind.performs.map(({operation}) => {
          return operation.payload.text;
        }),
      ).toEqual(['first']);
    });

    it('is not blocked by a dead-lettered operation', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'first', 'lane');
      await enqueue(testKind, 'second', 'lane');

      await testKind.performs[0].answer({type: 'operation-dead-lettered'});

      expect(
        testKind.performs.map(({operation}) => {
          return operation.payload.text;
        }),
      ).toEqual(['first', 'second']);
    });

    it('continues with the next operation of the lane when one is dropped by perform', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'first', 'lane');
      await enqueue(testKind, 'second', 'lane');

      await testKind.performs[0].answer({type: 'operation-dropped'});

      expect(testKind.performs).toHaveLength(2);
    });

    it('has the operation that was moved to another lane wait behind the operations there', async () => {
      const testKind = await startWith();
      kit.outbox.pause();
      await enqueue(testKind, 'mover', 'lane-a');
      await enqueue(testKind, 'resident', 'lane-b');
      await kit.enqueue(testKind, {payload: {text: 'moved'}, correlationKey: 'mover', orderingKey: 'lane-b'});

      kit.outbox.resume();
      await kit.clock.settle();

      expect(
        testKind.performs.map(({operation}) => {
          return operation.payload.text;
        }),
      ).toEqual(['resident']);
    });
  });

  describe('backoff', () => {
    it('waits 5 seconds before the first retry, then doubles up to 60 seconds', async () => {
      const testKind = await startWith({maxAttempts: 10});
      await enqueue(testKind, 'key');
      const waits: number[] = [];

      for (let retry = 0; retry < 6; retry++) {
        const attemptCount = testKind.performs.length;
        await testKind.lastPerform().answer({type: 'attempt-failed'});
        let waited = 0;
        while (testKind.performs.length === attemptCount) {
          await kit.clock.advance(1_000);
          waited += 1_000;
        }
        waits.push(waited);
      }

      expect(waits).toEqual([5_000, 10_000, 20_000, 40_000, 60_000, 60_000]);
    });

    it('is random between 0 and the limit: the source of randomness decides each wait', async () => {
      const testKind = await startWith({maxAttempts: 10});
      await enqueue(testKind, 'key');

      kit.random.queue(0.5);
      await testKind.lastPerform().answer({type: 'attempt-failed'});
      await kit.clock.advance(2_499);
      expect(testKind.performs).toHaveLength(1);
      await kit.clock.advance(1);
      expect(testKind.performs).toHaveLength(2);

      kit.random.queue(0.1);
      await testKind.lastPerform().answer({type: 'attempt-failed'});
      await kit.clock.advance(999);
      expect(testKind.performs).toHaveLength(2);
      await kit.clock.advance(1);
      expect(testKind.performs).toHaveLength(3);
    });

    it('may be no wait at all', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');

      kit.random.queue(0);
      await testKind.lastPerform().answer({type: 'attempt-failed'});
      await kit.clock.settle();

      expect(testKind.performs).toHaveLength(2);
    });

    it('is shared: other operations wait while it runs', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'failing');
      await testKind.lastPerform().answer({type: 'attempt-failed'});

      await enqueue(testKind, 'other');
      expect(testKind.performs).toHaveLength(1);
      await kit.clock.advance(5_000);

      expect(testKind.performs).toHaveLength(3);
    });

    it('resets on success', async () => {
      const testKind = await startWith({maxAttempts: 10});
      await enqueue(testKind, 'key');
      await testKind.lastPerform().answer({type: 'attempt-failed'});
      await kit.clock.advance(5_000);
      await testKind.lastPerform().answer({type: 'attempt-failed'});
      await kit.clock.advance(10_000);
      await testKind.lastPerform().answer({type: 'attempt-succeeded'});

      await enqueue(testKind, 'next');
      await testKind.lastPerform().answer({type: 'attempt-failed'});
      const attemptCount = testKind.performs.length;
      await kit.clock.advance(5_000);

      expect(testKind.performs).toHaveLength(attemptCount + 1);
    });

    it('resets on resume, which starts the waiting operation at once', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');
      await testKind.lastPerform().answer({type: 'attempt-failed'});
      expect(testKind.performs).toHaveLength(1);

      kit.outbox.pause();
      kit.outbox.resume();
      await kit.clock.settle();

      expect(testKind.performs).toHaveLength(2);
    });

    it('uses the configured minimum and maximum', async () => {
      kit.dispose();
      kit = createOutboxTestKit({backoff: {minimumMilliseconds: 100, maximumMilliseconds: 250}});
      const testKind = await startWith({maxAttempts: 10});
      await enqueue(testKind, 'key');

      await testKind.lastPerform().answer({type: 'attempt-failed'});
      await kit.clock.advance(100);
      await testKind.lastPerform().answer({type: 'attempt-failed'});
      await kit.clock.advance(199);
      expect(testKind.performs).toHaveLength(2);
      await kit.clock.advance(1);
      await testKind.lastPerform().answer({type: 'attempt-failed'});
      await kit.clock.advance(250);

      expect(testKind.performs).toHaveLength(4);
    });
  });

  describe('storage failures', () => {
    it('keeps the operation queued when the start of an attempt cannot be stored, and tries again after the backoff', async () => {
      const testKind = kit.registerKind();
      await kit.start({run: false});
      await enqueue(testKind, 'key');
      kit.store.fail('append', true);

      kit.outbox.resume();
      await kit.clock.settle();
      expect(testKind.operation('key')?.state).toBe('queued');
      expect(testKind.performs).toHaveLength(0);
      kit.store.fail('append', false);
      await kit.clock.advance(4_999);
      expect(testKind.performs).toHaveLength(0);
      await kit.clock.advance(1);

      expect(testKind.performs).toHaveLength(1);
    });

    it('stores the end of an attempt again after the backoff when the store fails', async () => {
      const testKind = await startWith();
      const id = await enqueue(testKind, 'key');
      kit.store.fail('append', true);

      await testKind.lastPerform().answer({type: 'attempt-failed'});
      expect(testKind.operation('key')?.state).toBe('in-progress');
      kit.store.fail('append', false);
      await kit.clock.advance(5_000);

      expect(historyOf(id).slice(0, 3)).toEqual([
        'operation-queued>queued',
        'attempt-started>in-progress',
        'attempt-failed>queued',
      ]);
    });

    it('stores the success of an attempt again after the backoff when the store cannot append it', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');
      kit.store.fail('append', true);

      await testKind.lastPerform().answer({type: 'attempt-succeeded'});
      expect(testKind.operation('key')?.state).toBe('in-progress');
      kit.store.fail('append', false);
      await kit.clock.advance(5_000);

      expect(testKind.operation('key')).toBeUndefined();
    });

    it('counts an operation as ended once its final snapshot is stored, although deleting its snapshots failed', async () => {
      const testKind = await startWith();
      const id = await enqueue(testKind, 'key');
      const waiting = kit.outbox.hold('key');
      await kit.clock.settle();
      kit.store.fail('remove', true);

      await testKind.lastPerform().answer({type: 'attempt-succeeded'});

      expect(await waiting).toMatchObject({type: 'operation-succeeded'});
      expect(testKind.operation('key')).toBeUndefined();
      expect(testKind.changes.at(-1)?.state).toBe('succeeded');
      expect(kit.store.history(id).at(-1)).toMatchObject({state: 'succeeded'});
      expect(kit.logger.entriesOf('Operation not deleted')).toHaveLength(1);
      expect(kit.logger.entriesOf('Attempt result not stored')).toEqual([]);
    });

    it('does not reuse a snapshot number when a key is enqueued again after a failed delete', async () => {
      const testKind = await startWith();
      const first = await enqueue(testKind, 'key');
      kit.store.fail('remove', true);
      await testKind.lastPerform().answer({type: 'attempt-succeeded'});

      const second = await enqueue(testKind, 'key');

      expect(second).not.toBe(first);
      expect(
        kit.store.history(second).map(({seq}) => {
          return seq;
        }),
      ).toEqual([1, 2]);
    });
  });

  describe('onChanged', () => {
    it('logs a throw of onChanged and carries on', async () => {
      const testKind = await startWith({
        onChanged: () => {
          throw new RangeError('boom');
        },
      });

      const outcome = await kit.enqueue(testKind, {correlationKey: 'key'});

      expect(outcome.type).toBe('operation-queued');
      expect(testKind.performs).toHaveLength(1);
      expect(kit.logger.entriesOf('onChanged threw')[0].attributes).toMatchObject({errorName: 'RangeError'});
    });

    it('is optional', async () => {
      const testKind = await startWith({onChanged: undefined});

      await enqueue(testKind, 'key');

      expect(testKind.performs).toHaveLength(1);
    });

    it('hears each state an operation enters, once', async () => {
      const testKind = await startWith();
      await enqueue(testKind, 'key');
      await testKind.lastPerform().answer({type: 'attempt-failed'});
      await kit.clock.advance(5_000);
      await testKind.lastPerform().answer({type: 'operation-dead-lettered'});

      expect(
        testKind.changes.map(({state}) => {
          return state;
        }),
      ).toEqual(['queued', 'in-progress', 'queued', 'in-progress', 'dead-lettered']);
    });
  });
});
