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

import {isInState, isOutcome} from './tagged';
import {
  createOutboxTestKit,
  createStoredSnapshot,
  parseTestPayload,
  type AttemptCall,
  type OutboxTestKit,
  type TestKind,
} from './testing/createOutboxTestKit';
import type {EnqueueRequest, Kind, OperationSnapshot, OperationState} from './types';

type KindOptions = Partial<Kind<{text: string}>>;
type LaneMode = 'follows' | 'continues';

type Way = {
  name: string;
  kindOptions: KindOptions;
  /** The request of the operation that is given up */
  request: Partial<EnqueueRequest<{text: string}>>;
  /** Whether the outbox runs: giving up while the operation waits is seen with an outbox that sends nothing */
  runs: boolean;
  endsFollowersAs: 'dead-lettered' | 'forgotten';
  giveUp: (kit: OutboxTestKit, testKind: TestKind) => Promise<unknown>;
};

function attemptOf(testKind: TestKind, text: string): AttemptCall {
  const found = testKind.attempts.find(({operation}) => {
    return operation.payload.text === text;
  });
  if (found === undefined) {
    throw new Error(`${text} was not attempted`);
  }
  return found;
}

function attemptedTexts(testKind: TestKind): string[] {
  return testKind.attempts.map(({operation}) => {
    return operation.payload.text;
  });
}

function stateOf(testKind: TestKind, correlationKey: string): OperationState | 'forgotten' {
  const findResult = testKind.handle.find(correlationKey);
  return isOutcome('operation-found')(findResult) ? findResult.operation.state : 'forgotten';
}

/** The texts of the payloads, in the order their operations ended */
function endedOrder(testKind: TestKind): string[] {
  return testKind.changes.filter(isInState('dead-lettered', 'dropped')).map(({payload}) => {
    return payload.text;
  });
}

const ways: Way[] = [
  {
    name: 'its attempt answers attempt-dead-lettered',
    kindOptions: {},
    request: {},
    runs: true,
    endsFollowersAs: 'dead-lettered',
    giveUp: async (_, testKind) => {
      return attemptOf(testKind, 'a').answer({outcome: 'attempt-dead-lettered'});
    },
  },
  {
    name: 'its attempt answers attempt-dropped',
    kindOptions: {},
    request: {},
    runs: true,
    endsFollowersAs: 'forgotten',
    giveUp: async (_, testKind) => {
      return attemptOf(testKind, 'a').answer({outcome: 'attempt-dropped'});
    },
  },
  {
    name: 'its attempts run out and the kind dead-letters',
    kindOptions: {maxAttempts: 1},
    request: {},
    runs: true,
    endsFollowersAs: 'dead-lettered',
    giveUp: async (_, testKind) => {
      return attemptOf(testKind, 'a').answer({outcome: 'attempt-failed'});
    },
  },
  {
    name: 'its attempts run out and the kind drops',
    kindOptions: {maxAttempts: 1, whenGivenUp: 'drop'},
    request: {},
    runs: true,
    endsFollowersAs: 'forgotten',
    giveUp: async (_, testKind) => {
      return attemptOf(testKind, 'a').answer({outcome: 'attempt-failed'});
    },
  },
  {
    name: 'its last attempt errors and the kind drops',
    kindOptions: {maxAttempts: 1, whenGivenUp: 'drop'},
    request: {},
    runs: true,
    endsFollowersAs: 'forgotten',
    giveUp: async (_, testKind) => {
      return attemptOf(testKind, 'a').reject(new Error('failed'));
    },
  },
  {
    name: 'its last attempt times out and the kind dead-letters',
    kindOptions: {maxAttempts: 1},
    request: {attemptTimeoutMilliseconds: 1_000},
    runs: true,
    endsFollowersAs: 'dead-lettered',
    giveUp: async kit => {
      return kit.clock.advance(1_000);
    },
  },
  {
    name: 'it expires and the kind dead-letters',
    kindOptions: {},
    request: {expiresAfterMilliseconds: 1_000},
    runs: false,
    endsFollowersAs: 'dead-lettered',
    giveUp: async kit => {
      return kit.clock.advance(1_000);
    },
  },
  {
    name: 'it expires and the kind drops',
    kindOptions: {whenGivenUp: 'drop'},
    request: {expiresAfterMilliseconds: 1_000},
    runs: false,
    endsFollowersAs: 'forgotten',
    giveUp: async kit => {
      return kit.clock.advance(1_000);
    },
  },
  {
    name: 'the owner drops it while its attempt runs',
    kindOptions: {},
    request: {},
    runs: true,
    endsFollowersAs: 'forgotten',
    giveUp: async kit => {
      return kit.outbox.drop('a');
    },
  },
  {
    name: 'the owner drops it while it waits',
    kindOptions: {},
    request: {},
    runs: false,
    endsFollowersAs: 'forgotten',
    giveUp: async kit => {
      return kit.outbox.drop('a');
    },
  },
  {
    name: 'the owner drops it while it is on hold',
    kindOptions: {},
    request: {},
    runs: false,
    endsFollowersAs: 'forgotten',
    giveUp: async kit => {
      await kit.outbox.hold('a');
      return kit.outbox.drop('a');
    },
  },
];

describe('createOutbox lanes', () => {
  let kit: OutboxTestKit;

  beforeEach(() => {
    kit = createOutboxTestKit();
  });

  async function enqueue(
    testKind: TestKind,
    text: string,
    request: Partial<EnqueueRequest<{text: string}>> = {},
  ): Promise<void> {
    await kit.enqueue(testKind, {payload: {text}, correlationKey: text, laneKey: 'lane', ...request});
  }

  function laneContents(laneKey: string): [string, OperationState][] {
    return kit.lane(laneKey).operations.map(({payload, state}) => {
      return [parseTestPayload(payload).text, state];
    });
  }

  function storedTriggers(text: string): string[] {
    return kit.store.calls.flatMap(call => {
      return call.method === 'append' && parseTestPayload(call.snapshot.payload).text === text
        ? [call.snapshot.trigger]
        : [];
    });
  }

  describe('the order of a lane', () => {
    it('sends the operations of a lane one at a time, in the order they were enqueued', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await enqueue(testKind, 'c');
      expect(attemptedTexts(testKind)).toEqual(['a']);

      await attemptOf(testKind, 'a').answer({outcome: 'attempt-succeeded'});
      expect(attemptedTexts(testKind)).toEqual(['a', 'b']);

      await attemptOf(testKind, 'b').answer({outcome: 'attempt-succeeded'});
      expect(attemptedTexts(testKind)).toEqual(['a', 'b', 'c']);
    });

    it('lists the operations of a lane in that order, the one that runs first', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await enqueue(testKind, 'c');

      expect(kit.outbox.lane('lane')).toEqual({
        outcome: 'lane-found',
        lane: {
          state: 'moving',
          laneKey: 'lane',
          operations: [
            expect.objectContaining({state: 'in-progress', payload: {text: 'a'}}),
            expect.objectContaining({state: 'queued', payload: {text: 'b'}}),
            expect.objectContaining({state: 'queued', payload: {text: 'c'}}),
          ],
        },
      });
    });

    it('no longer lists an operation that succeeded', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');

      await attemptOf(testKind, 'a').answer({outcome: 'attempt-succeeded'});

      expect(laneContents('lane')).toEqual([['b', 'in-progress']]);
    });

    it('answers lane-empty once no unfinished operation is in the lane', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await enqueue(testKind, 'a');

      await attemptOf(testKind, 'a').answer({outcome: 'attempt-succeeded'});

      expect(kit.outbox.lane('lane')).toEqual({outcome: 'lane-empty'});
      expect(kit.outbox.lanes()).toEqual({outcome: 'lanes-listed', lanes: []});
    });

    it('lists every lane that has an operation', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await enqueue(testKind, 'a', {laneKey: 'one'});
      await enqueue(testKind, 'b', {laneKey: 'two'});
      await enqueue(testKind, 'c', {laneKey: undefined});

      expect(kit.outbox.lanes()).toEqual({
        outcome: 'lanes-listed',
        lanes: [
          expect.objectContaining({state: 'moving', laneKey: 'one'}),
          expect.objectContaining({state: 'moving', laneKey: 'two'}),
        ],
      });
    });

    it('sends the operations of different lanes, and those without a lane, side by side', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await enqueue(testKind, 'a', {laneKey: 'one'});
      await enqueue(testKind, 'b', {laneKey: 'two'});
      await enqueue(testKind, 'c', {laneKey: undefined});
      await enqueue(testKind, 'd', {laneKey: undefined});
      await enqueue(testKind, 'e', {laneKey: 'one'});

      expect(attemptedTexts(testKind)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('keeps the operations of several kinds in one lane in the order they were enqueued', async () => {
      const first = kit.registerKind();
      const second = kit.registerKind();
      await kit.start();
      await enqueue(first, 'a');
      await enqueue(second, 'x');
      await enqueue(first, 'b');

      expect(attemptedTexts(first)).toEqual(['a']);
      expect(attemptedTexts(second)).toEqual([]);

      await attemptOf(first, 'a').answer({outcome: 'attempt-succeeded'});

      expect(attemptedTexts(second)).toEqual(['x']);
      expect(attemptedTexts(first)).toEqual(['a']);
    });

    it('keeps the place of an operation that is retried, so the ones behind it wait for the backoff and the retry', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');

      await attemptOf(testKind, 'a').answer({outcome: 'attempt-failed'});
      await kit.clock.advance(4_999);

      expect(attemptedTexts(testKind)).toEqual(['a']);
      expect(laneContents('lane')).toEqual([
        ['a', 'queued'],
        ['b', 'queued'],
      ]);

      await kit.clock.advance(1);

      expect(attemptedTexts(testKind)).toEqual(['a', 'a']);
    });

    it('lets the operations behind a dead-lettered one carry on, and no longer lists it', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await enqueue(testKind, 'c');

      await attemptOf(testKind, 'a').answer({outcome: 'attempt-dead-lettered'});

      expect(stateOf(testKind, 'a')).toBe('dead-lettered');
      expect(laneContents('lane')).toEqual([
        ['b', 'in-progress'],
        ['c', 'queued'],
      ]);
    });

    it('lets the operations behind one that was dropped carry on', async () => {
      const testKind = kit.registerKind();
      await kit.start({run: false});
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');

      await kit.outbox.drop('a');
      kit.outbox.resume();
      await kit.clock.settle();

      expect(attemptedTexts(testKind)).toEqual(['b']);
    });
  });

  describe('a lane that is blocked', () => {
    it('is the lane whose first operation is on hold, and nothing in it is sent', async () => {
      const testKind = kit.registerKind();
      await kit.start({run: false});
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await kit.outbox.hold('a');

      kit.outbox.resume();
      await kit.clock.settle();

      expect(kit.outbox.lane('lane')).toEqual({
        outcome: 'lane-found',
        lane: {
          state: 'blocked',
          laneKey: 'lane',
          operations: [
            expect.objectContaining({state: 'on-hold', payload: {text: 'a'}}),
            expect.objectContaining({state: 'queued', payload: {text: 'b'}}),
          ],
        },
      });
      expect(attemptedTexts(testKind)).toEqual([]);
    });

    it('does not stop the other lanes, nor the operations without a lane', async () => {
      const testKind = kit.registerKind();
      await kit.start({run: false});
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'other', {laneKey: 'other'});
      await enqueue(testKind, 'free', {laneKey: undefined});
      await kit.outbox.hold('a');

      kit.outbox.resume();
      await kit.clock.settle();

      expect(attemptedTexts(testKind)).toEqual(['other', 'free']);
    });

    it('moves again when the held operation is released, and sends it first', async () => {
      const testKind = kit.registerKind();
      await kit.start({run: false});
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await kit.outbox.hold('a');
      kit.outbox.resume();

      await kit.outbox.release('a');
      await kit.clock.settle();

      expect(kit.lane('lane').state).toBe('moving');
      expect(attemptedTexts(testKind)).toEqual(['a']);
    });

    it('becomes blocked when the operation that is first after the one that succeeded is on hold', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await enqueue(testKind, 'c');
      await kit.outbox.hold('b');

      await attemptOf(testKind, 'a').answer({outcome: 'attempt-succeeded'});

      expect(kit.lane('lane').state).toBe('blocked');
      expect(attemptedTexts(testKind)).toEqual(['a']);
    });

    it('blocks the lane when the attempt of its first operation answers attempt-held', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');

      await attemptOf(testKind, 'a').answer({outcome: 'attempt-held'});

      expect(laneContents('lane')).toEqual([
        ['a', 'on-hold'],
        ['b', 'queued'],
      ]);
      expect(kit.lane('lane').state).toBe('blocked');
      expect(attemptedTexts(testKind)).toEqual(['a']);
    });
  });

  describe.each(ways)('when $name', way => {
    async function setUp(laneWhenGivenUp: LaneMode): Promise<TestKind> {
      const testKind = kit.registerKind({laneWhenGivenUp, ...way.kindOptions});
      await kit.start({run: way.runs});
      await enqueue(testKind, 'a', way.request);
      await enqueue(testKind, 'b');
      await enqueue(testKind, 'c');
      await enqueue(testKind, 'other', {laneKey: 'other-lane'});
      await enqueue(testKind, 'free', {laneKey: undefined});
      return testKind;
    }

    it("ends the operations of its kind behind it the same way, in lane order, when the kind's lane follows", async () => {
      const testKind = await setUp('follows');

      await way.giveUp(kit, testKind);

      expect(stateOf(testKind, 'b')).toBe(way.endsFollowersAs);
      expect(stateOf(testKind, 'c')).toBe(way.endsFollowersAs);
      expect(endedOrder(testKind)).toEqual(['b', 'c', 'a']);
      const expectedTrigger = way.endsFollowersAs === 'dead-lettered' ? 'lane-dead-lettered' : 'lane-dropped';
      expect(storedTriggers('b').at(-1)).toBe(expectedTrigger);
      expect(storedTriggers('c').at(-1)).toBe(expectedTrigger);
    });

    it('leaves the operations of other lanes and without a lane alone when the lane follows', async () => {
      const testKind = await setUp('follows');

      await way.giveUp(kit, testKind);

      const expectedState = way.runs ? 'in-progress' : 'queued';
      expect(stateOf(testKind, 'other')).toBe(expectedState);
      expect(stateOf(testKind, 'free')).toBe(expectedState);
    });

    it('sends nothing of the lane that has ended when the lane follows', async () => {
      const testKind = await setUp('follows');

      await way.giveUp(kit, testKind);
      kit.outbox.resume();
      await kit.clock.advance(120_000);

      expect(attemptedTexts(testKind)).not.toContain('b');
      expect(attemptedTexts(testKind)).not.toContain('c');
    });

    it('lets the operations behind it carry on when the lane continues, as it does by default', async () => {
      const testKind = await setUp('continues');

      await way.giveUp(kit, testKind);
      await kit.clock.settle();

      expect(stateOf(testKind, 'b')).toBe(way.runs ? 'in-progress' : 'queued');
      expect(stateOf(testKind, 'c')).toBe('queued');
      expect(endedOrder(testKind)).toEqual(['a']);
    });
  });

  describe('a cascade', () => {
    it('does not happen by default', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');

      await attemptOf(testKind, 'a').answer({outcome: 'attempt-dead-lettered'});

      expect(stateOf(testKind, 'b')).toBe('in-progress');
    });

    it('leaves the lane empty when it dead-letters everything in it', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');

      await attemptOf(testKind, 'a').answer({outcome: 'attempt-dead-lettered'});

      expect(kit.outbox.lane('lane')).toEqual({outcome: 'lane-empty'});
    });

    it('ends the operations of the kind behind it that are on hold as well', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await enqueue(testKind, 'held');
      await kit.outbox.hold('held');

      await attemptOf(testKind, 'a').answer({outcome: 'attempt-dead-lettered'});

      expect(stateOf(testKind, 'held')).toBe('dead-lettered');
      expect(endedOrder(testKind)).toEqual(['b', 'held', 'a']);
    });

    it('ends only the operations of the kind that was given up, and lets the other kinds carry on', async () => {
      const following = kit.registerKind({laneWhenGivenUp: 'follows'});
      const other = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start();
      await enqueue(following, 'a');
      await enqueue(other, 'x');
      await enqueue(following, 'b');
      await enqueue(other, 'y');

      await attemptOf(following, 'a').answer({outcome: 'attempt-dead-lettered'});

      expect(stateOf(following, 'b')).toBe('dead-lettered');
      expect(stateOf(other, 'x')).toBe('in-progress');
      expect(stateOf(other, 'y')).toBe('queued');
      expect(endedOrder(following)).toEqual(['b', 'a']);
    });

    it('is decided by the kind that is given up: a kind that continues does not follow one that follows', async () => {
      const following = kit.registerKind({laneWhenGivenUp: 'follows'});
      const continuing = kit.registerKind();
      await kit.start();
      await enqueue(continuing, 'a');
      await enqueue(following, 'b');

      await attemptOf(continuing, 'a').answer({outcome: 'attempt-dead-lettered'});

      expect(stateOf(following, 'b')).toBe('in-progress');
    });

    it('does not happen from an operation that was dead-lettered already when it is dropped', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start();
      await enqueue(testKind, 'first');
      await attemptOf(testKind, 'first').answer({outcome: 'attempt-dead-lettered'});
      kit.outbox.pause();
      await enqueue(testKind, 'second');

      await kit.outbox.drop('first');

      expect(laneContents('lane')).toEqual([['second', 'queued']]);
    });

    it('does not happen when an operation succeeds', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');

      await attemptOf(testKind, 'a').answer({outcome: 'attempt-succeeded'});

      expect(stateOf(testKind, 'b')).toBe('in-progress');
    });
  });

  describe('a drop by the owner that cascades while its attempt runs', () => {
    it('aborts the attempt, drops the operations behind it, and ignores the late answer', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await enqueue(testKind, 'c');
      const attempt = attemptOf(testKind, 'a');

      expect(await kit.outbox.drop('a')).toEqual({
        outcome: 'operation-dropped',
        operation: expect.objectContaining({state: 'dropped', payload: {text: 'a'}}),
      });
      await attempt.answer({outcome: 'attempt-succeeded'});

      expect(attempt.signal.aborted).toBe(true);
      expect(endedOrder(testKind)).toEqual(['b', 'c', 'a']);
      expect(kit.outbox.lanes()).toEqual({outcome: 'lanes-listed', lanes: []});
      expect(kit.store.operationIds()).toEqual([]);
    });

    it('answers the commands parked on the attempt that the operation was dropped', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      const parked = kit.outbox.hold('a');
      await kit.clock.settle();

      await kit.outbox.drop('a');

      expect(await parked).toEqual({
        outcome: 'operation-dropped',
        operation: expect.objectContaining({state: 'dropped', payload: {text: 'a'}}),
      });
      expect(stateOf(testKind, 'b')).toBe('forgotten');
    });

    it('does not drop the operations behind it when the kind continues', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');

      await kit.outbox.drop('a');
      await kit.clock.settle();

      expect(stateOf(testKind, 'b')).toBe('in-progress');
    });
  });

  describe('commands on an operation a cascade ended', () => {
    it('are refused when it was dead-lettered, as they are for any dead-lettered operation', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await attemptOf(testKind, 'a').answer({outcome: 'attempt-dead-lettered'});

      expect(await kit.outbox.hold('b')).toEqual({
        outcome: 'transition-refused',
        trigger: 'operation-held',
        operation: expect.objectContaining({state: 'dead-lettered'}),
      });
      expect(await kit.outbox.release('b')).toEqual({
        outcome: 'transition-refused',
        trigger: 'operation-released',
        operation: expect.objectContaining({state: 'dead-lettered'}),
      });
    });

    it('can version it, which queues it again', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await attemptOf(testKind, 'a').answer({outcome: 'attempt-dead-lettered'});

      expect(await testKind.handle.enqueue({payload: {text: 'again'}, correlationKey: 'b', laneKey: 'lane'})).toEqual({
        outcome: 'operation-versioned',
        operation: expect.objectContaining({state: 'queued', payload: {text: 'again'}}),
      });
    });

    it('can drop it', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await attemptOf(testKind, 'a').answer({outcome: 'attempt-dead-lettered'});

      expect(await kit.outbox.drop('b')).toEqual({
        outcome: 'operation-dropped',
        operation: expect.objectContaining({state: 'dropped', payload: {text: 'b'}}),
      });
    });

    it('answer operation-not-found when it was dropped', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows', whenGivenUp: 'drop', maxAttempts: 1});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await attemptOf(testKind, 'a').answer({outcome: 'attempt-failed'});

      expect(await kit.outbox.hold('b')).toEqual({outcome: 'operation-not-found'});
      expect(await kit.outbox.release('b')).toEqual({outcome: 'operation-not-found'});
      expect(await kit.outbox.drop('b')).toEqual({outcome: 'operation-not-found'});
    });

    it('wait for the attempt of the operation that is given up, and find what the cascade left', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      const parked = kit.outbox.hold('a');
      await kit.clock.settle();

      await attemptOf(testKind, 'a').answer({outcome: 'attempt-dead-lettered'});

      expect(await parked).toEqual({
        outcome: 'transition-refused',
        trigger: 'operation-held',
        operation: expect.objectContaining({state: 'dead-lettered', payload: {text: 'a'}}),
      });
      expect(stateOf(testKind, 'b')).toBe('dead-lettered');
    });
  });

  describe('a cascade that a store failure interrupted', () => {
    it('is finished when the end of the attempt is stored again, and nothing is sent meanwhile', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await enqueue(testKind, 'c');
      kit.store.failAfter('append', 1);

      await attemptOf(testKind, 'a').answer({outcome: 'attempt-dead-lettered'});

      expect(stateOf(testKind, 'a')).toBe('in-progress');
      expect(stateOf(testKind, 'b')).toBe('dead-lettered');
      expect(stateOf(testKind, 'c')).toBe('queued');
      expect(attemptedTexts(testKind)).toEqual(['a']);

      kit.store.fail('append', false);
      await kit.clock.advance(60_000);

      expect(stateOf(testKind, 'a')).toBe('dead-lettered');
      expect(stateOf(testKind, 'c')).toBe('dead-lettered');
      expect(attemptedTexts(testKind)).toEqual(['a']);
      expect(endedOrder(testKind)).toEqual(['b', 'c', 'a']);
    });

    it('is finished at the next pass when giving up by expiry was interrupted', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start({run: false});
      await enqueue(testKind, 'a', {expiresAfterMilliseconds: 1_000});
      await enqueue(testKind, 'b');
      await enqueue(testKind, 'c');
      kit.store.failAfter('append', 1);

      await kit.clock.advance(1_000);

      expect(stateOf(testKind, 'a')).toBe('queued');
      expect(stateOf(testKind, 'b')).toBe('dead-lettered');
      expect(stateOf(testKind, 'c')).toBe('queued');

      kit.store.fail('append', false);
      await kit.clock.advance(60_000);

      expect(endedOrder(testKind)).toEqual(['b', 'c', 'a']);
    });

    it("is finished by the owner repeating the drop when the owner's drop was interrupted", async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start({run: false});
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await enqueue(testKind, 'c');
      kit.store.failAfter('append', 1);

      expect(await kit.outbox.drop('a')).toEqual({outcome: 'storage-failed', errorName: 'TestFailure'});

      expect(stateOf(testKind, 'a')).toBe('queued');
      expect(stateOf(testKind, 'b')).toBe('forgotten');
      expect(stateOf(testKind, 'c')).toBe('queued');

      kit.store.fail('append', false);

      expect(await kit.outbox.drop('a')).toEqual({
        outcome: 'operation-dropped',
        operation: expect.objectContaining({state: 'dropped', payload: {text: 'a'}}),
      });
      expect(endedOrder(testKind)).toEqual(['b', 'c', 'a']);
    });

    it("changes nothing when the owner's drop fails at its first step", async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start({run: false});
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      kit.store.fail('append', true);

      expect(await kit.outbox.drop('a')).toEqual({outcome: 'storage-failed', errorName: 'TestFailure'});

      expect(laneContents('lane')).toEqual([
        ['a', 'queued'],
        ['b', 'queued'],
      ]);
    });

    it('keeps the attempt of the operation that is dropped running when its drop fails', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      kit.store.fail('append', true);

      await kit.outbox.drop('a');

      expect(attemptOf(testKind, 'a').signal.aborted).toBe(false);
      expect(stateOf(testKind, 'a')).toBe('in-progress');
      expect(stateOf(testKind, 'b')).toBe('queued');
    });
  });

  describe('a cascade that a reload interrupted', () => {
    function seedInLane(
      testKind: TestKind,
      text: string,
      queuedSeq: number,
      overrides: Partial<OperationSnapshot> = {},
    ): void {
      kit.store.seed(
        createStoredSnapshot({
          kind: testKind.kind.name,
          id: text,
          payload: {text},
          correlation: {state: 'correlated', correlationKey: text},
          lane: {state: 'in-lane', laneKey: 'lane'},
          queuedSeq,
          ...overrides,
        }),
      );
    }

    it.each([
      {whenGivenUp: 'dead-letter', followersEnd: 'dead-lettered', trigger: 'lane-dead-lettered'},
      {whenGivenUp: 'drop', followersEnd: 'forgotten', trigger: 'lane-dropped'},
    ] as const)(
      'is finished at the start for what still waits, when the kind $whenGivenUp and the last attempt was interrupted',
      async ({whenGivenUp, followersEnd, trigger}) => {
        const testKind = kit.registerKind({laneWhenGivenUp: 'follows', maxAttempts: 1, whenGivenUp});
        seedInLane(testKind, 'a', 1, {state: 'in-progress', attempts: 1});
        seedInLane(testKind, 'b', 2, {state: 'dead-lettered', trigger: 'lane-dead-lettered'});
        seedInLane(testKind, 'c', 3);
        seedInLane(testKind, 'd', 4, {state: 'on-hold'});

        await kit.start();

        expect(stateOf(testKind, 'a')).toBe(followersEnd);
        expect(stateOf(testKind, 'b')).toBe('dead-lettered');
        expect(stateOf(testKind, 'c')).toBe(followersEnd);
        expect(stateOf(testKind, 'd')).toBe(followersEnd);
        expect(kit.store.calls).toContainEqual({
          method: 'append',
          snapshot: expect.objectContaining({id: 'c', trigger}),
        });
        expect(attemptedTexts(testKind)).toEqual([]);
      },
    );

    it('is repeated by the retried attempt when the crash came before the end of the attempt was stored', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await enqueue(testKind, 'c');
      kit.store.failAfter('append', 1);
      await attemptOf(testKind, 'a').answer({outcome: 'attempt-dead-lettered'});
      await kit.outbox.stop();
      kit.store.fail('append', false);

      await kit.start();

      expect(stateOf(testKind, 'a')).toBe('in-progress');
      expect(stateOf(testKind, 'b')).toBe('dead-lettered');
      expect(stateOf(testKind, 'c')).toBe('queued');
      expect(attemptedTexts(testKind)).toEqual(['a', 'a']);

      await testKind.lastAttempt().answer({outcome: 'attempt-dead-lettered'});

      expect(stateOf(testKind, 'a')).toBe('dead-lettered');
      expect(stateOf(testKind, 'c')).toBe('dead-lettered');
    });

    it("is not finished by a reload when the owner's drop was interrupted, but by the owner repeating it", async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start({run: false});
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await enqueue(testKind, 'c');
      kit.store.failAfter('append', 1);
      await kit.outbox.drop('a');
      await kit.outbox.stop();
      kit.store.fail('append', false);

      await kit.start({run: false});

      expect(stateOf(testKind, 'a')).toBe('queued');
      expect(stateOf(testKind, 'b')).toBe('forgotten');
      expect(stateOf(testKind, 'c')).toBe('queued');

      await kit.outbox.drop('a');

      expect(kit.store.operationIds()).toEqual([]);
    });
  });
});
