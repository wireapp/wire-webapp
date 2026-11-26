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

type KindOptions = Partial<Kind<{text: string}>>;
type Mode = 'follows' | 'continues';

type Way = {
  name: string;
  kindOptions: KindOptions;
  /** Whether the outbox runs: giving up by expiry is seen with an outbox that sends nothing */
  runs: boolean;
  givesUpAs: 'dead-lettered' | 'dropped';
  giveUp: (kit: OutboxTestKit, testKind: TestKind) => Promise<void>;
};

function performOf(testKind: TestKind, text: string): TestKind['performs'][number] {
  const found = testKind.performs.find(({operation}) => {
    return operation.payload.text === text;
  });
  if (found === undefined) {
    throw new Error(`${text} was not sent`);
  }
  return found;
}

const ways: Way[] = [
  {
    name: 'perform answers operation-dead-lettered',
    kindOptions: {},
    runs: true,
    givesUpAs: 'dead-lettered',
    giveUp: async (_, testKind) => {
      return performOf(testKind, 'a').answer({type: 'operation-dead-lettered'});
    },
  },
  {
    name: 'perform answers operation-dropped',
    kindOptions: {},
    runs: true,
    givesUpAs: 'dropped',
    giveUp: async (_, testKind) => {
      return performOf(testKind, 'a').answer({type: 'operation-dropped'});
    },
  },
  {
    name: 'the attempts run out, and the kind dead-letters',
    kindOptions: {maxAttempts: 1},
    runs: true,
    givesUpAs: 'dead-lettered',
    giveUp: async (_, testKind) => {
      return performOf(testKind, 'a').answer({type: 'attempt-failed'});
    },
  },
  {
    name: 'the attempts run out, and the kind drops',
    kindOptions: {maxAttempts: 1, whenGivenUp: 'drop'},
    runs: true,
    givesUpAs: 'dropped',
    giveUp: async (_, testKind) => {
      return performOf(testKind, 'a').answer({type: 'attempt-failed'});
    },
  },
  {
    name: 'the last attempt errors, and the kind drops',
    kindOptions: {maxAttempts: 1, whenGivenUp: 'drop'},
    runs: true,
    givesUpAs: 'dropped',
    giveUp: async (_, testKind) => {
      return performOf(testKind, 'a').reject(new Error('failed'));
    },
  },
  {
    name: 'it expires, and the kind dead-letters',
    kindOptions: {},
    runs: false,
    givesUpAs: 'dead-lettered',
    giveUp: async kit => {
      return kit.clock.advance(1_000);
    },
  },
  {
    name: 'it expires, and the kind drops',
    kindOptions: {whenGivenUp: 'drop'},
    runs: false,
    givesUpAs: 'dropped',
    giveUp: async kit => {
      return kit.clock.advance(1_000);
    },
  },
];

describe('createOutbox when an operation is given up in its lane', () => {
  let kit: OutboxTestKit;

  beforeEach(() => {
    kit = createOutboxTestKit();
  });

  afterEach(() => {
    kit.dispose();
  });

  async function enqueue(
    testKind: TestKind,
    text: string,
    orderingKey: string | null = 'lane',
    expiresAfterMilliseconds?: number,
  ): Promise<string> {
    const outcome = await kit.enqueue(testKind, {
      payload: {text},
      correlationKey: text,
      orderingKey: orderingKey ?? undefined,
      expiresAfterMilliseconds,
    });
    return outcome.type === 'operation-queued' ? outcome.operation.id : '';
  }

  /** The texts of the payloads, in the order their operations entered a given-up state */
  function givenUpOrder(testKind: TestKind): string[] {
    return testKind.changes
      .filter(({state}) => {
        return state === 'dead-lettered' || state === 'dropped';
      })
      .map(({payload}) => {
        return payload.text;
      });
  }

  describe.each(ways)('$name', way => {
    async function setUp(mode: Mode): Promise<{testKind: TestKind; ids: Record<string, string>}> {
      const testKind = kit.registerKind({laneWhenGivenUp: mode, ...way.kindOptions});
      await kit.start({run: way.runs});
      const ids = {
        a: await enqueue(testKind, 'a', 'lane', 1_000),
        b: await enqueue(testKind, 'b'),
        c: await enqueue(testKind, 'c'),
        other: await enqueue(testKind, 'other', 'other-lane'),
        free: await enqueue(testKind, 'free', null),
      };
      return {testKind, ids};
    }

    it("ends the operations of the kind behind it the same way, in lane order, when the kind's lane follows", async () => {
      const {testKind, ids} = await setUp('follows');

      await way.giveUp(kit, testKind);

      for (const text of ['b', 'c']) {
        const operation = testKind.operation(text);
        if (way.givesUpAs === 'dead-lettered') {
          expect(operation?.state).toBe('dead-lettered');
          expect(kit.store.history(ids[text]).at(-1)).toMatchObject({trigger: 'lane-dead-lettered'});
        } else {
          expect(operation).toBeUndefined();
          expect(kit.store.history(ids[text])).toEqual([]);
        }
      }
      expect(givenUpOrder(testKind)).toEqual(['b', 'c', 'a']);
    });

    it('leaves the operations of other lanes and without an ordering key alone when it follows', async () => {
      const {testKind} = await setUp('follows');

      await way.giveUp(kit, testKind);

      expect(testKind.operation('other')?.state).toBe(way.runs ? 'in-progress' : 'queued');
      expect(testKind.operation('free')?.state).toBe(way.runs ? 'in-progress' : 'queued');
    });

    it('sends nothing of the lane that has ended', async () => {
      const {testKind} = await setUp('follows');

      await way.giveUp(kit, testKind);
      await kit.clock.advance(120_000);

      const sent = testKind.performs.map(({operation}) => {
        return operation.payload.text;
      });
      expect(sent).not.toContain('b');
      expect(sent).not.toContain('c');
    });

    it('lets the operations behind it carry on when the lane continues, as it does by default', async () => {
      const {testKind} = await setUp('continues');

      await way.giveUp(kit, testKind);

      expect(testKind.operation('b')?.state).toBe(way.runs ? 'in-progress' : 'queued');
      expect(testKind.operation('c')?.state).toBe('queued');
      expect(givenUpOrder(testKind)).toEqual(['a']);
    });
  });

  it('continues by default', async () => {
    const testKind = kit.registerKind();
    await kit.start();
    await enqueue(testKind, 'a');
    await enqueue(testKind, 'b');

    await performOf(testKind, 'a').answer({type: 'operation-dead-lettered'});

    expect(testKind.operation('b')?.state).toBe('in-progress');
  });

  describe('a lane of several kinds', () => {
    it('ends only the operations of the kind that was given up, held ones included; the others carry on', async () => {
      const following = kit.registerKind({laneWhenGivenUp: 'follows'});
      const other = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start();
      await enqueue(following, 'a');
      await enqueue(other, 'x');
      await enqueue(following, 'b');
      await enqueue(other, 'y');
      await enqueue(following, 'held');
      await kit.outbox.hold('held');

      await performOf(following, 'a').answer({type: 'operation-dead-lettered'});

      expect(following.operation('b')?.state).toBe('dead-lettered');
      expect(following.operation('held')?.state).toBe('dead-lettered');
      expect(other.operation('x')?.state).toBe('in-progress');
      expect(other.operation('y')?.state).toBe('queued');
      expect(givenUpOrder(following)).toEqual(['b', 'held', 'a']);
    });

    it('does not follow a kind that continues, whatever the kind before it does', async () => {
      const following = kit.registerKind({laneWhenGivenUp: 'follows'});
      const continuing = kit.registerKind();
      await kit.start();
      await enqueue(continuing, 'a');
      await enqueue(following, 'b');

      await performOf(continuing, 'a').answer({type: 'operation-dead-lettered'});

      expect(following.operation('b')?.state).toBe('in-progress');
    });
  });

  describe('a drop by the owner', () => {
    it('is not giving up: the operations behind it carry on', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start({run: false});
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');

      await kit.outbox.drop('a');

      expect(testKind.operation('b')?.state).toBe('queued');
    });

    it('is not giving up when it aborts a running attempt either', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');

      await kit.outbox.drop('a');
      await kit.clock.settle();

      expect(testKind.operation('b')?.state).toBe('in-progress');
    });
  });

  describe('commands on an operation the cascade ended', () => {
    it('answer how it ended', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await enqueue(testKind, 'c');
      await performOf(testKind, 'a').answer({type: 'operation-dead-lettered'});

      expect(await kit.outbox.hold('b')).toMatchObject({
        type: 'operation-not-queued',
        operation: {state: 'dead-lettered'},
      });
      expect(await kit.outbox.release('b')).toMatchObject({type: 'operation-not-on-hold'});
      expect(
        await testKind.handle.enqueue({payload: {text: 'again'}, correlationKey: 'b', orderingKey: 'lane'}),
      ).toMatchObject({
        type: 'operation-versioned',
        operation: {state: 'queued'},
      });
    });

    it('answer operation-not-found when the cascade dropped it', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows', whenGivenUp: 'drop', maxAttempts: 1});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await performOf(testKind, 'a').answer({type: 'attempt-failed'});

      expect(await kit.outbox.hold('b')).toEqual({type: 'operation-not-found'});
    });

    it('wait for the attempt of the operation that is given up, and apply to what it left', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      const waiting = kit.outbox.hold('a');
      await kit.clock.settle();

      await performOf(testKind, 'a').answer({type: 'operation-dead-lettered'});

      expect(await waiting).toMatchObject({type: 'operation-not-queued', operation: {state: 'dead-lettered'}});
      expect(testKind.operation('b')?.state).toBe('dead-lettered');
    });
  });

  describe('a store failure partway through', () => {
    it('finishes it when the end of the attempt is stored again, and sends nothing meanwhile', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      await enqueue(testKind, 'c');
      kit.store.failAfter('append', 1);

      await performOf(testKind, 'a').answer({type: 'operation-dead-lettered'});

      expect(testKind.operation('b')?.state).toBe('dead-lettered');
      expect(testKind.operation('c')?.state).toBe('queued');
      expect(testKind.operation('a')?.state).toBe('in-progress');
      expect(testKind.performs).toHaveLength(1);

      kit.store.fail('append', false);
      await kit.clock.advance(5_000);

      expect(testKind.operation('c')?.state).toBe('dead-lettered');
      expect(testKind.operation('a')?.state).toBe('dead-lettered');
      expect(testKind.performs).toHaveLength(1);
      expect(givenUpOrder(testKind)).toEqual(['b', 'c', 'a']);
    });

    it('finishes it at the next pass when giving up by expiry fails partway', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start({run: false});
      await enqueue(testKind, 'a', 'lane', 1_000);
      await enqueue(testKind, 'b');
      await enqueue(testKind, 'c');
      kit.store.failAfter('append', 1);

      await kit.clock.advance(1_000);

      expect(testKind.operation('b')?.state).toBe('dead-lettered');
      expect(testKind.operation('c')?.state).toBe('queued');
      expect(testKind.operation('a')?.state).toBe('queued');

      kit.store.fail('append', false);
      await kit.clock.advance(60_000);

      expect(
        ['a', 'b', 'c'].map(text => {
          return testKind.operation(text)?.state;
        }),
      ).toEqual(['dead-lettered', 'dead-lettered', 'dead-lettered']);
    });

    it('stops the attempt of a drop by the owner from cascading even when the store fails around it', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start({run: false});
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      kit.store.fail('append', true);

      await kit.outbox.drop('a');

      expect(testKind.operation('b')?.state).toBe('queued');
    });
  });

  describe('a reload partway through', () => {
    it('finishes it at the start, for what is still waiting, and sends nothing', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows', maxAttempts: 1});
      const lane = {kind: testKind.kind.name, orderingKey: 'lane'};
      kit.store.seed(
        createStoredSnapshot({...lane, id: 'a', correlationKey: 'a', queuedSeq: 1, state: 'in-progress', attempts: 1}),
      );
      kit.store.seed(
        createStoredSnapshot({
          ...lane,
          id: 'b',
          correlationKey: 'b',
          queuedSeq: 2,
          state: 'dead-lettered',
          trigger: 'lane-dead-lettered',
        }),
      );
      kit.store.seed(createStoredSnapshot({...lane, id: 'c', correlationKey: 'c', queuedSeq: 3}));
      kit.store.seed(createStoredSnapshot({...lane, id: 'd', correlationKey: 'd', queuedSeq: 4, state: 'on-hold'}));

      await kit.start();

      expect(
        ['a', 'b', 'c', 'd'].map(text => {
          return kit.findOperation(text)?.state;
        }),
      ).toEqual(['dead-lettered', 'dead-lettered', 'dead-lettered', 'dead-lettered']);
      expect(testKind.performs).toHaveLength(0);
      expect(kit.store.history('c').at(-1)).toMatchObject({trigger: 'lane-dead-lettered'});
    });

    it('lets a reload retry the attempt, which gives up again, when the crash came before the origin was stored', async () => {
      const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
      await kit.start();
      await enqueue(testKind, 'a');
      await enqueue(testKind, 'b');
      kit.store.failAfter('append', 1);
      await performOf(testKind, 'a').answer({type: 'operation-dead-lettered'});
      await kit.outbox.stop();
      kit.store.fail('append', false);

      await kit.start();

      expect(testKind.operation('b')?.state).toBe('dead-lettered');
      expect(testKind.operation('a')?.state).toBe('in-progress');
      expect(testKind.performs).toHaveLength(2);
      expect(testKind.performs[1].operation.payload.text).toBe('a');
    });
  });
});
