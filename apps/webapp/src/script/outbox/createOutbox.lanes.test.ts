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
  correlated,
  createOutboxTestKit,
  createStoredSnapshot,
  parseTestPayload,
  type OutboxTestKit,
  type TestKind,
} from './testing/createOutboxTestKit';
import type {EndingOptions, EnqueueRequest, Kind, Cascade, OperationSnapshot, OperationState} from './types';

type KindOptions = Partial<Kind<{text: string}>>;
type Ending = 'dead-lettered' | 'deleted';

const SETTING_OF = {'dead-lettered': 'laneWhenDeadLettered', deleted: 'laneWhenDeleted'} as const;
const OTHER_ENDING: Record<Ending, Ending> = {'dead-lettered': 'deleted', deleted: 'dead-lettered'};
const LANE_TRIGGER_OF = {'dead-lettered': 'lane-dead-lettered', deleted: 'lane-deleted'} as const;
/** How the handle finds an operation after the ending: a deleted one is forgotten */
const FOUND_AS: Record<Ending, OperationState | 'forgotten'> = {'dead-lettered': 'dead-lettered', deleted: 'forgotten'};

function laneSetting(ending: Ending, setting: 'follows' | 'continues'): KindOptions {
  return {[SETTING_OF[ending]]: setting};
}

type Way = {
  name: string;
  ending: Ending;
  kindOptions: KindOptions;
  /** The request of the operation that ends */
  request: Partial<EnqueueRequest<{text: string}>>;
  /** Whether the outbox runs: an ending while the operation waits is seen with an outbox that sends nothing */
  runs: boolean;
  end: (kit: OutboxTestKit, testKind: TestKind) => Promise<unknown>;
};

const ownerWays = (['dead-lettered', 'deleted'] as const).flatMap((ending): Way[] => {
  const command = ending === 'dead-lettered' ? 'deadLetter' : 'delete';
  return [
    {
      name: `the owner calls ${command} while its attempt runs`,
      ending,
      kindOptions: {},
      request: {},
      runs: true,
      end: async kit => {
        return kit.outbox[command]('a');
      },
    },
    {
      name: `the owner calls ${command} while it waits`,
      ending,
      kindOptions: {},
      request: {},
      runs: false,
      end: async kit => {
        return kit.outbox[command]('a');
      },
    },
    {
      name: `the owner calls ${command} while it is on hold`,
      ending,
      kindOptions: {},
      request: {},
      runs: false,
      end: async kit => {
        await kit.outbox.hold('a');
        return kit.outbox[command]('a');
      },
    },
  ];
});

const ways: Way[] = [
  {
    name: 'its attempt answers attempt-dead-lettered',
    ending: 'dead-lettered',
    kindOptions: {},
    request: {},
    runs: true,
    end: async (_, testKind) => {
      return testKind.attemptOf('a').answer({outcome: 'attempt-dead-lettered'});
    },
  },
  {
    name: 'its attempt answers attempt-deleted',
    ending: 'deleted',
    kindOptions: {},
    request: {},
    runs: true,
    end: async (_, testKind) => {
      return testKind.attemptOf('a').answer({outcome: 'attempt-deleted'});
    },
  },
  {
    name: 'its attempts run out and the kind dead-letters',
    ending: 'dead-lettered',
    kindOptions: {maxAttempts: 1},
    request: {},
    runs: true,
    end: async (_, testKind) => {
      return testKind.attemptOf('a').answer({outcome: 'attempt-failed'});
    },
  },
  {
    name: 'its attempts run out and the kind deletes',
    ending: 'deleted',
    kindOptions: {maxAttempts: 1, whenExhausted: 'delete'},
    request: {},
    runs: true,
    end: async (_, testKind) => {
      return testKind.attemptOf('a').answer({outcome: 'attempt-failed'});
    },
  },
  {
    name: 'its last attempt errors and the kind deletes',
    ending: 'deleted',
    kindOptions: {maxAttempts: 1, whenExhausted: 'delete'},
    request: {},
    runs: true,
    end: async (_, testKind) => {
      return testKind.attemptOf('a').reject(new Error('failed'));
    },
  },
  {
    name: 'its last attempt times out and the kind dead-letters',
    ending: 'dead-lettered',
    kindOptions: {maxAttempts: 1},
    request: {attemptTimeoutMilliseconds: 1_000},
    runs: true,
    end: async kit => {
      return kit.clock.advance(1_000);
    },
  },
  {
    name: 'it expires and the kind dead-letters',
    ending: 'dead-lettered',
    kindOptions: {},
    request: {expiresAfterMilliseconds: 1_000},
    runs: false,
    end: async kit => {
      return kit.clock.advance(1_000);
    },
  },
  {
    name: 'it expires and the kind deletes',
    ending: 'deleted',
    kindOptions: {whenExhausted: 'delete'},
    request: {expiresAfterMilliseconds: 1_000},
    runs: false,
    end: async kit => {
      return kit.clock.advance(1_000);
    },
  },
  ...ownerWays,
];

const commands = [
  {
    command: 'deadLetter',
    ending: 'dead-lettered',
    end: async (kit: OutboxTestKit, correlationKey: string, options?: EndingOptions) => {
      return kit.outbox.deadLetter(correlationKey, options);
    },
  },
  {
    command: 'delete',
    ending: 'deleted',
    end: async (kit: OutboxTestKit, correlationKey: string, options?: EndingOptions) => {
      return kit.outbox.delete(correlationKey, options);
    },
  },
] as const;

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
    await kit.enqueueKeyed(testKind, text, {laneKey: 'lane', ...request});
  }

  async function enqueueABC(testKind: TestKind): Promise<void> {
    await enqueue(testKind, 'a');
    await enqueue(testKind, 'b');
    await enqueue(testKind, 'c');
  }

  function laneContents(laneKey: string): [string, OperationState][] {
    return kit.lane(laneKey).operations.map(({payload, state}) => {
      return [parseTestPayload(payload).text, state];
    });
  }

  /** Every snapshot appended for the payload text, including those of an operation deleted since */
  function storedSnapshots(text: string): OperationSnapshot[] {
    return kit.store.calls.flatMap(call => {
      return call.method === 'append' && parseTestPayload(call.snapshot.payload).text === text ? [call.snapshot] : [];
    });
  }

  function storedTriggers(text: string): string[] {
    return storedSnapshots(text).map(({trigger}) => {
      return trigger;
    });
  }

  function storedCascades(text: string): Cascade['state'][] {
    return storedSnapshots(text).map(({cascade}) => {
      return cascade.state;
    });
  }

  describe('the order of a lane', () => {
    it('sends the operations of a lane one at a time, in the order they were enqueued', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await enqueueABC(testKind);
      expect(testKind.attemptedTexts()).toEqual(['a']);

      await testKind.attemptOf('a').answer({outcome: 'attempt-succeeded'});
      expect(testKind.attemptedTexts()).toEqual(['a', 'b']);

      await testKind.attemptOf('b').answer({outcome: 'attempt-succeeded'});
      expect(testKind.attemptedTexts()).toEqual(['a', 'b', 'c']);
    });

    it('lists the operations of a lane in that order, the one that runs first', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await enqueueABC(testKind);

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

      await testKind.attemptOf('a').answer({outcome: 'attempt-succeeded'});

      expect(laneContents('lane')).toEqual([['b', 'in-progress']]);
    });

    it('answers lane-empty once no unfinished operation is in the lane', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await enqueue(testKind, 'a');

      await testKind.attemptOf('a').answer({outcome: 'attempt-succeeded'});

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

      expect(testKind.attemptedTexts()).toEqual(['a', 'b', 'c', 'd']);
    });

    it('keeps the operations of several kinds in one lane in the order they were enqueued', async () => {
      const first = kit.registerKind();
      const second = kit.registerKind();
      await kit.start();
      await enqueue(first, 'a');
      await enqueue(second, 'x');
      await enqueue(first, 'b');

      expect(first.attemptedTexts()).toEqual(['a']);
      expect(second.attemptedTexts()).toEqual([]);

      await first.attemptOf('a').answer({outcome: 'attempt-succeeded'});

      expect(second.attemptedTexts()).toEqual(['x']);
      expect(first.attemptedTexts()).toEqual(['a']);
    });

    it('keeps the place of an operation that is retried, so the ones behind it wait for the backoff and the retry', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');

      await testKind.attemptOf('a').answer({outcome: 'attempt-failed'});
      await kit.clock.advance(4_999);

      expect(testKind.attemptedTexts()).toEqual(['a']);
      expect(laneContents('lane')).toEqual([
        ['a', 'queued'],
        ['b', 'queued'],
      ]);

      await kit.clock.advance(1);

      expect(testKind.attemptedTexts()).toEqual(['a', 'a']);
    });

    it('lets the operations behind a dead-lettered one carry on, and no longer lists it', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await enqueueABC(testKind);

      await testKind.attemptOf('a').answer({outcome: 'attempt-dead-lettered'});

      expect(testKind.stateOf('a')).toBe('dead-lettered');
      expect(laneContents('lane')).toEqual([
        ['b', 'in-progress'],
        ['c', 'queued'],
      ]);
    });

    it('lets the operations behind one that was deleted carry on', async () => {
      const testKind = kit.registerKind();
      await kit.start({run: false});
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');

      await kit.outbox.delete('a');
      kit.outbox.resume();
      await kit.clock.settle();

      expect(testKind.attemptedTexts()).toEqual(['b']);
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
      expect(testKind.attemptedTexts()).toEqual([]);
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

      expect(testKind.attemptedTexts()).toEqual(['other', 'free']);
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
      expect(testKind.attemptedTexts()).toEqual(['a']);
    });

    it('becomes blocked when the operation that is first after the one that succeeded is on hold', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await enqueueABC(testKind);
      await kit.outbox.hold('b');

      await testKind.attemptOf('a').answer({outcome: 'attempt-succeeded'});

      expect(kit.lane('lane').state).toBe('blocked');
      expect(testKind.attemptedTexts()).toEqual(['a']);
    });

    it('blocks the lane when the attempt of its first operation answers attempt-held', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');

      await testKind.attemptOf('a').answer({outcome: 'attempt-held'});

      expect(laneContents('lane')).toEqual([
        ['a', 'on-hold'],
        ['b', 'queued'],
      ]);
      expect(kit.lane('lane').state).toBe('blocked');
      expect(testKind.attemptedTexts()).toEqual(['a']);
    });
  });

  describe.each(ways)('when $name', way => {
    async function setUp(laneOptions: KindOptions): Promise<TestKind> {
      const testKind = kit.registerKind({...laneOptions, ...way.kindOptions});
      await kit.start({run: way.runs});
      await enqueue(testKind, 'a', way.request);
      await enqueue(testKind, 'b');
      await enqueue(testKind, 'c');
      await enqueue(testKind, 'other', {laneKey: 'other-lane'});
      await enqueue(testKind, 'free', {laneKey: undefined});
      return testKind;
    }

    it("ends the operations of its kind behind it the same way, after it and in lane order, when the kind's lane follows that ending", async () => {
      const testKind = await setUp(laneSetting(way.ending, 'follows'));

      await way.end(kit, testKind);

      expect(testKind.stateOf('a')).toBe(FOUND_AS[way.ending]);
      expect(testKind.stateOf('b')).toBe(FOUND_AS[way.ending]);
      expect(testKind.stateOf('c')).toBe(FOUND_AS[way.ending]);
      expect(testKind.endedOrder()).toEqual(['a', 'b', 'c']);
      expect(storedTriggers('b').at(-1)).toBe(LANE_TRIGGER_OF[way.ending]);
      expect(storedTriggers('c').at(-1)).toBe(LANE_TRIGGER_OF[way.ending]);
    });

    it('leaves the operations of other lanes and without a lane alone when the lane follows', async () => {
      const testKind = await setUp(laneSetting(way.ending, 'follows'));

      await way.end(kit, testKind);

      const expectedState = way.runs ? 'in-progress' : 'queued';
      expect(testKind.stateOf('other')).toBe(expectedState);
      expect(testKind.stateOf('free')).toBe(expectedState);
    });

    it('sends nothing of the lane that has ended when the lane follows', async () => {
      const testKind = await setUp(laneSetting(way.ending, 'follows'));

      await way.end(kit, testKind);
      kit.outbox.resume();
      await kit.clock.advance(120_000);

      expect(testKind.attemptedTexts()).not.toContain('b');
      expect(testKind.attemptedTexts()).not.toContain('c');
    });

    it('lets the operations behind it carry on when that ending continues, as it does by default', async () => {
      const testKind = await setUp({});

      await way.end(kit, testKind);
      await kit.clock.settle();

      expect(testKind.stateOf('b')).toBe(way.runs ? 'in-progress' : 'queued');
      expect(testKind.stateOf('c')).toBe('queued');
      expect(testKind.endedOrder()).toEqual(['a']);
    });

    it('lets the operations behind it carry on when only the other ending follows', async () => {
      const testKind = await setUp({
        ...laneSetting(way.ending, 'continues'),
        ...laneSetting(OTHER_ENDING[way.ending], 'follows'),
      });

      await way.end(kit, testKind);
      await kit.clock.settle();

      expect(testKind.stateOf('b')).toBe(way.runs ? 'in-progress' : 'queued');
      expect(testKind.endedOrder()).toEqual(['a']);
    });
  });

  describe.each(commands)('the lane given to $command', ({ending, end}) => {
    it('makes the operations behind it end the same way when the kind continues', async () => {
      const testKind = kit.registerKind(laneSetting(ending, 'continues'));
      await kit.start({run: false});
      await enqueueABC(testKind);

      await end(kit, 'a', {lane: 'follows'});

      expect(testKind.stateOf('b')).toBe(FOUND_AS[ending]);
      expect(testKind.stateOf('c')).toBe(FOUND_AS[ending]);
      expect(storedTriggers('c').at(-1)).toBe(LANE_TRIGGER_OF[ending]);
    });

    it('lets the operations behind it carry on when the kind follows', async () => {
      const testKind = kit.registerKind(laneSetting(ending, 'follows'));
      await kit.start({run: false});
      await enqueueABC(testKind);

      await end(kit, 'a', {lane: 'continues'});

      expect(testKind.stateOf('b')).toBe('queued');
      expect(testKind.stateOf('c')).toBe('queued');
      expect(testKind.endedOrder()).toEqual(['a']);
    });

    it('is stored with the ending: pending until the operations behind it have ended, then none', async () => {
      const testKind = kit.registerKind();
      await kit.start({run: false});
      await enqueueABC(testKind);

      await end(kit, 'a', {lane: 'follows'});

      expect(storedCascades('a')).toEqual(['none', 'pending', 'none']);
      expect(storedCascades('b')).toEqual(['none', 'none']);
    });

    it('is stored as continues when the lane continues', async () => {
      const testKind = kit.registerKind(laneSetting(ending, 'follows'));
      await kit.start({run: false});
      await enqueueABC(testKind);

      await end(kit, 'a', {lane: 'continues'});

      expect(storedCascades('a')).toEqual(['none', 'none']);
    });

    it('applies to that call only', async () => {
      const testKind = kit.registerKind();
      await kit.start({run: false});
      await enqueue(testKind, 'a');
      await end(kit, 'a', {lane: 'follows'});
      await enqueue(testKind, 'd');
      await enqueue(testKind, 'e');

      await end(kit, 'd');

      expect(testKind.stateOf('e')).toBe('queued');
    });

    it('aborts the running attempt, ends the operations behind it, and ignores the late answer', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await enqueueABC(testKind);
      const attempt = testKind.attemptOf('a');

      expect(await end(kit, 'a', {lane: 'follows'})).toEqual({
        outcome: ending === 'dead-lettered' ? 'operation-dead-lettered' : 'operation-deleted',
        operation: expect.objectContaining({state: ending, payload: {text: 'a'}}),
      });
      await attempt.answer({outcome: 'attempt-succeeded'});

      expect(attempt.signal.aborted).toBe(true);
      expect(testKind.endedOrder()).toEqual(['a', 'b', 'c']);
      expect(kit.outbox.lanes()).toEqual({outcome: 'lanes-listed', lanes: []});
      expect(testKind.attemptedTexts()).toEqual(['a']);
    });

    it('stops the outbox when a save fails partway, and the next start finishes the cascade from it', async () => {
      const testKind = kit.registerKind();
      await kit.start({run: false});
      await enqueueABC(testKind);
      kit.store.failAfter('append', 2);

      expect(await end(kit, 'a', {lane: 'follows'})).toEqual({outcome: 'storage-failed', errorName: 'TestFailure'});
      expect(kit.outbox.isStarted()).toBe(false);
      expect(storedCascades('a').at(-1)).toBe('pending');
      expect(kit.triggersOf('operation-3')).toEqual(['operation-queued']);

      kit.store.fail('append', false);
      await kit.start();

      expect(testKind.stateOf('c')).toBe(FOUND_AS[ending]);
      expect(storedTriggers('c').at(-1)).toBe(LANE_TRIGGER_OF[ending]);
      expect(testKind.attemptedTexts()).toEqual([]);
    });
  });

  describe('a cascade', () => {
    it('does not happen by default', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');

      await testKind.attemptOf('a').answer({outcome: 'attempt-dead-lettered'});

      expect(testKind.stateOf('b')).toBe('in-progress');
    });

    it('leaves the lane empty when it dead-letters everything in it', async () => {
      const testKind = kit.registerKind({laneWhenDeadLettered: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');

      await testKind.attemptOf('a').answer({outcome: 'attempt-dead-lettered'});

      expect(kit.outbox.lane('lane')).toEqual({outcome: 'lane-empty'});
    });

    it('ends the operations of the kind behind it that are on hold as well', async () => {
      const testKind = kit.registerKind({laneWhenDeadLettered: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await enqueue(testKind, 'held');
      await kit.outbox.hold('held');

      await testKind.attemptOf('a').answer({outcome: 'attempt-dead-lettered'});

      expect(testKind.stateOf('held')).toBe('dead-lettered');
      expect(testKind.endedOrder()).toEqual(['a', 'b', 'held']);
    });

    it('ends only the operations of the kind that ended, and lets the other kinds carry on', async () => {
      const following = kit.registerKind({laneWhenDeadLettered: 'follows'});
      const other = kit.registerKind({laneWhenDeadLettered: 'follows'});
      await kit.start();
      await enqueue(following, 'a');
      await enqueue(other, 'x');
      await enqueue(following, 'b');
      await enqueue(other, 'y');

      await following.attemptOf('a').answer({outcome: 'attempt-dead-lettered'});

      expect(following.stateOf('b')).toBe('dead-lettered');
      expect(other.stateOf('x')).toBe('in-progress');
      expect(other.stateOf('y')).toBe('queued');
      expect(following.endedOrder()).toEqual(['a', 'b']);
    });

    it('is decided by the kind that ended: a kind that continues does not follow one that follows', async () => {
      const following = kit.registerKind({laneWhenDeadLettered: 'follows'});
      const continuing = kit.registerKind();
      await kit.start();
      await enqueue(continuing, 'a');
      await enqueue(following, 'b');

      await continuing.attemptOf('a').answer({outcome: 'attempt-dead-lettered'});

      expect(following.stateOf('b')).toBe('in-progress');
    });

    it.each([{}, {lane: 'follows'}] as const)(
      'does not happen from an operation that was dead-lettered already when it is deleted, given %o',
      async options => {
        const testKind = kit.registerKind({laneWhenDeadLettered: 'follows', laneWhenDeleted: 'follows'});
        await kit.start();
        await enqueue(testKind, 'first');
        await testKind.attemptOf('first').answer({outcome: 'attempt-dead-lettered'});
        kit.outbox.pause();
        await enqueue(testKind, 'second');

        await kit.outbox.delete('first', options);

        expect(laneContents('lane')).toEqual([['second', 'queued']]);
      },
    );

    it('does not happen when an operation succeeds', async () => {
      const testKind = kit.registerKind({laneWhenDeadLettered: 'follows', laneWhenDeleted: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');

      await testKind.attemptOf('a').answer({outcome: 'attempt-succeeded'});

      expect(testKind.stateOf('b')).toBe('in-progress');
    });

    it('does not reach the operations enqueued after it', async () => {
      const testKind = kit.registerKind({laneWhenDeadLettered: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await testKind.attemptOf('a').answer({outcome: 'attempt-dead-lettered'});

      await enqueue(testKind, 'later');

      expect(testKind.stateOf('later')).toBe('in-progress');
    });
  });

  describe('the owner ending an operation whose attempt runs, when the lane follows', () => {
    it('answers the commands parked on the attempt that the operation was deleted', async () => {
      const testKind = kit.registerKind({laneWhenDeleted: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      const parked = kit.outbox.hold('a');
      await kit.clock.settle();

      await kit.outbox.delete('a');

      expect(await parked).toEqual({
        outcome: 'operation-deleted',
        operation: expect.objectContaining({state: 'deleted', payload: {text: 'a'}}),
      });
      expect(testKind.stateOf('b')).toBe('forgotten');
    });

    it('applies the commands parked on the attempt to the operation it dead-lettered', async () => {
      const testKind = kit.registerKind({laneWhenDeadLettered: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      const parked = kit.outbox.hold('a');
      await kit.clock.settle();

      await kit.outbox.deadLetter('a');

      expect(await parked).toEqual({
        outcome: 'transition-refused',
        trigger: 'operation-held',
        operation: expect.objectContaining({state: 'dead-lettered', payload: {text: 'a'}}),
      });
      expect(testKind.stateOf('b')).toBe('dead-lettered');
    });
  });

  describe('commands on an operation a cascade ended', () => {
    it('are refused when it was dead-lettered, as they are for any dead-lettered operation', async () => {
      const testKind = kit.registerKind({laneWhenDeadLettered: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await testKind.attemptOf('a').answer({outcome: 'attempt-dead-lettered'});

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
      expect(await kit.outbox.deadLetter('b')).toEqual({
        outcome: 'transition-refused',
        trigger: 'operation-dead-lettered',
        operation: expect.objectContaining({state: 'dead-lettered'}),
      });
    });

    it('can version it, which queues it again', async () => {
      const testKind = kit.registerKind({laneWhenDeadLettered: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await testKind.attemptOf('a').answer({outcome: 'attempt-dead-lettered'});

      expect(await testKind.handle.enqueue({payload: {text: 'again'}, correlationKey: 'b', laneKey: 'lane'})).toEqual({
        outcome: 'operation-versioned',
        operation: expect.objectContaining({state: 'queued', payload: {text: 'again'}}),
      });
    });

    it('can delete it', async () => {
      const testKind = kit.registerKind({laneWhenDeadLettered: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await testKind.attemptOf('a').answer({outcome: 'attempt-dead-lettered'});

      expect(await kit.outbox.delete('b')).toEqual({
        outcome: 'operation-deleted',
        operation: expect.objectContaining({state: 'deleted', payload: {text: 'b'}}),
      });
    });

    it('answer operation-not-found when it was deleted', async () => {
      const testKind = kit.registerKind({laneWhenDeleted: 'follows', whenExhausted: 'delete', maxAttempts: 1});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await testKind.attemptOf('a').answer({outcome: 'attempt-failed'});

      expect(await kit.outbox.hold('b')).toEqual({outcome: 'operation-not-found'});
      expect(await kit.outbox.release('b')).toEqual({outcome: 'operation-not-found'});
      expect(await kit.outbox.deadLetter('b')).toEqual({outcome: 'operation-not-found'});
      expect(await kit.outbox.delete('b')).toEqual({outcome: 'operation-not-found'});
    });

    it('wait for the attempt of the operation that ended, and find what the cascade left', async () => {
      const testKind = kit.registerKind({laneWhenDeadLettered: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      const parked = kit.outbox.hold('a');
      await kit.clock.settle();

      await testKind.attemptOf('a').answer({outcome: 'attempt-dead-lettered'});

      expect(await parked).toEqual({
        outcome: 'transition-refused',
        trigger: 'operation-held',
        operation: expect.objectContaining({state: 'dead-lettered', payload: {text: 'a'}}),
      });
      expect(testKind.stateOf('b')).toBe('dead-lettered');
    });
  });

  describe('a cascade that a failed save interrupted', () => {
    it('stops the outbox with the ending stored as pending, and is finished at the next start', async () => {
      const testKind = kit.registerKind({laneWhenDeadLettered: 'follows'});
      await kit.start();
      await enqueueABC(testKind);
      kit.store.failAfter('append', 2);

      await testKind.attemptOf('a').answer({outcome: 'attempt-dead-lettered'});

      expect(kit.outbox.isStarted()).toBe(false);
      expect(storedCascades('a').at(-1)).toBe('pending');
      expect(storedTriggers('b').at(-1)).toBe('lane-dead-lettered');
      expect(kit.triggersOf('operation-3')).toEqual(['operation-queued']);

      kit.store.fail('append', false);
      await kit.start();

      expect(kit.outbox.lane('lane')).toEqual({outcome: 'lane-empty'});
      expect(testKind.stateOf('c')).toBe('dead-lettered');
      expect(storedCascades('a').at(-1)).toBe('none');
      expect(testKind.attemptedTexts()).toEqual(['a']);
    });

    it('is finished at the next start when an ending by expiry was interrupted', async () => {
      const testKind = kit.registerKind({laneWhenDeadLettered: 'follows'});
      await kit.start({run: false});
      await enqueue(testKind, 'a', {expiresAfterMilliseconds: 1_000});
      await enqueue(testKind, 'b');
      await enqueue(testKind, 'c');
      kit.store.failAfter('append', 2);

      await kit.clock.advance(1_000);

      expect(kit.outbox.isStarted()).toBe(false);
      expect(kit.triggersOf('operation-3')).toEqual(['operation-queued']);

      kit.store.fail('append', false);
      await kit.start({run: false});

      expect(testKind.stateOf('c')).toBe('dead-lettered');
      expect(storedTriggers('c').at(-1)).toBe('lane-dead-lettered');
    });

    it('keeps a deleted operation stored until the operations behind it are deleted at the next start', async () => {
      const testKind = kit.registerKind({laneWhenDeleted: 'follows'});
      await kit.start({run: false});
      await enqueueABC(testKind);
      kit.store.failAfter('append', 2);

      expect(await kit.outbox.delete('a')).toEqual({outcome: 'storage-failed', errorName: 'TestFailure'});
      expect(kit.store.operationIds()).toEqual(['operation-1', 'operation-3']);

      kit.store.fail('append', false);
      await kit.start({run: false});

      expect(kit.outbox.lanes()).toEqual({outcome: 'lanes-listed', lanes: []});
      expect(kit.store.operationIds()).toEqual([]);
    });

    it("stores nothing more when the owner's ending fails at its first step", async () => {
      const testKind = kit.registerKind({laneWhenDeleted: 'follows'});
      await kit.start({run: false});
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      kit.store.fail('append', true);

      expect(await kit.outbox.delete('a')).toEqual({outcome: 'storage-failed', errorName: 'TestFailure'});

      expect(kit.store.history('operation-1')).toHaveLength(1);
      expect(kit.store.history('operation-2')).toHaveLength(1);
    });

    it('aborts the attempt of the operation when its ending fails', async () => {
      const testKind = kit.registerKind({laneWhenDeleted: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      kit.store.fail('append', true);

      await kit.outbox.delete('a');

      expect(testKind.attemptOf('a').signal.aborted).toBe(true);
      expect(kit.store.history('operation-1').at(-1)).toMatchObject({state: 'in-progress'});
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
          correlation: correlated(text),
          lane: {state: 'in-lane', laneKey: 'lane'},
          queuedSeq,
          ...overrides,
        }),
      );
    }

    it.each(commands)(
      'is finished at the start from the decision stored with an ending in $ending, whatever the kind says',
      async ({ending}) => {
        const testKind = kit.registerKind();
        const trigger = LANE_TRIGGER_OF[ending];
        seedInLane(testKind, 'a', 1, {state: ending, cascade: {state: 'pending', trigger}});
        seedInLane(testKind, 'b', 2, {state: 'dead-lettered', trigger, cascade: {state: 'none'}});
        seedInLane(testKind, 'c', 3);
        seedInLane(testKind, 'd', 4, {state: 'on-hold'});

        await kit.start();

        expect(testKind.stateOf('a')).toBe(FOUND_AS[ending]);
        expect(testKind.stateOf('b')).toBe('dead-lettered');
        expect(testKind.stateOf('c')).toBe(FOUND_AS[ending]);
        expect(testKind.stateOf('d')).toBe(FOUND_AS[ending]);
        expect(storedTriggers('c').at(-1)).toBe(trigger);
        expect(testKind.attemptedTexts()).toEqual([]);
      },
    );

    it.each([
      {whenExhausted: 'dead-letter', ending: 'dead-lettered'},
      {whenExhausted: 'delete', ending: 'deleted'},
    ] as const)(
      'ends what still waits at the start, when the kind $whenExhausted and the last attempt was interrupted',
      async ({whenExhausted, ending}) => {
        const testKind = kit.registerKind({...laneSetting(ending, 'follows'), maxAttempts: 1, whenExhausted});
        seedInLane(testKind, 'a', 1, {state: 'in-progress', attempts: 1});
        seedInLane(testKind, 'c', 3);
        seedInLane(testKind, 'd', 4, {state: 'on-hold'});

        await kit.start();

        expect(testKind.stateOf('a')).toBe(FOUND_AS[ending]);
        expect(testKind.stateOf('c')).toBe(FOUND_AS[ending]);
        expect(testKind.stateOf('d')).toBe(FOUND_AS[ending]);
        expect(testKind.attemptedTexts()).toEqual([]);
      },
    );

    it('is repeated by the retried attempt when the crash came before the ending was stored', async () => {
      const testKind = kit.registerKind({laneWhenDeadLettered: 'follows'});
      await kit.start();
      await enqueueABC(testKind);
      kit.store.failAfter('append', 0);
      await testKind.attemptOf('a').answer({outcome: 'attempt-dead-lettered'});
      await kit.outbox.stop();
      kit.store.fail('append', false);

      await kit.start();

      expect(testKind.stateOf('a')).toBe('in-progress');
      expect(testKind.stateOf('b')).toBe('queued');
      expect(testKind.attemptedTexts()).toEqual(['a', 'a']);

      await testKind.lastAttempt().answer({outcome: 'attempt-dead-lettered'});

      expect(testKind.stateOf('b')).toBe('dead-lettered');
      expect(testKind.stateOf('c')).toBe('dead-lettered');
    });
  });
});
