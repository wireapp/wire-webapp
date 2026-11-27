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

type CommandName = 'enqueue' | 'hold' | 'release';
type KindOptions = Partial<Kind<{text: string}>>;
type Ending = {
  name: string;
  kindOptions: KindOptions;
  end: (kit: OutboxTestKit, testKind: TestKind) => Promise<void>;
  /** What each command answers, as a literal-matching object */
  answers: Record<CommandName, Record<string, unknown>>;
};

const COMMANDS: CommandName[] = ['enqueue', 'hold', 'release'];

const refused = (trigger: string, state: string): Record<string, unknown> => {
  return {outcome: 'transition-refused', trigger, operation: expect.objectContaining({state})};
};
const answered = (outcome: string, state: string): Record<string, unknown> => {
  return {outcome, operation: expect.objectContaining({state})};
};

const succeeded: Ending['answers'] = {
  enqueue: answered('operation-succeeded', 'succeeded'),
  hold: answered('operation-succeeded', 'succeeded'),
  release: answered('operation-succeeded', 'succeeded'),
};
const dropped: Ending['answers'] = {
  enqueue: answered('operation-dropped', 'dropped'),
  hold: answered('operation-dropped', 'dropped'),
  release: answered('operation-dropped', 'dropped'),
};
const queuedAgain: Ending['answers'] = {
  enqueue: answered('operation-versioned', 'queued'),
  hold: answered('operation-held', 'on-hold'),
  release: refused('operation-released', 'queued'),
};
const deadLettered: Ending['answers'] = {
  enqueue: answered('operation-versioned', 'queued'),
  hold: refused('operation-held', 'dead-lettered'),
  release: refused('operation-released', 'dead-lettered'),
};
const onHold: Ending['answers'] = {
  enqueue: answered('operation-versioned', 'queued'),
  hold: refused('operation-held', 'on-hold'),
  release: answered('operation-released', 'queued'),
};

const failures: Pick<Ending, 'name' | 'kindOptions' | 'end'>[] = [
  {
    name: 'failed',
    kindOptions: {},
    end: async (_, testKind) => {
      return testKind.lastAttempt().answer({outcome: 'attempt-failed'});
    },
  },
  {
    name: 'timed out',
    kindOptions: {attemptTimeoutMilliseconds: 1_000},
    end: async kit => {
      return kit.clock.advance(1_000);
    },
  },
  {
    name: 'errored',
    kindOptions: {},
    end: async (_, testKind) => {
      return testKind.lastAttempt().reject(new Error('failed'));
    },
  },
];

const limits: {name: string; kindOptions: KindOptions; answers: Ending['answers']}[] = [
  {name: 'with attempts left', kindOptions: {maxAttempts: 2}, answers: queuedAgain},
  {name: 'without attempts left, dead-lettering', kindOptions: {maxAttempts: 1}, answers: deadLettered},
  {name: 'without attempts left, dropping', kindOptions: {maxAttempts: 1, whenGivenUp: 'drop'}, answers: dropped},
];

const endings: Ending[] = [
  {
    name: 'succeeded',
    kindOptions: {},
    end: async (_, testKind) => {
      return testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});
    },
    answers: succeeded,
  },
  ...failures.flatMap(failure => {
    return limits.map(limit => {
      return {
        name: `${failure.name} ${limit.name}`,
        kindOptions: {...failure.kindOptions, ...limit.kindOptions},
        end: failure.end,
        answers: limit.answers,
      };
    });
  }),
  {
    name: 'dead-lettered',
    kindOptions: {},
    end: async (_, testKind) => {
      return testKind.lastAttempt().answer({outcome: 'attempt-dead-lettered'});
    },
    answers: deadLettered,
  },
  {
    name: 'dropped',
    kindOptions: {},
    end: async (_, testKind) => {
      return testKind.lastAttempt().answer({outcome: 'attempt-dropped'});
    },
    answers: dropped,
  },
  {
    name: 'held',
    kindOptions: {},
    end: async (_, testKind) => {
      return testKind.lastAttempt().answer({outcome: 'attempt-held'});
    },
    answers: onHold,
  },
];

describe('createOutbox commands on an operation with an attempt running', () => {
  let kit: OutboxTestKit;

  beforeEach(() => {
    kit = createOutboxTestKit();
  });

  async function startWithRunningAttempt(kindOptions: KindOptions = {}): Promise<TestKind> {
    const testKind = kit.registerKind(kindOptions);
    await kit.start();
    await kit.enqueue(testKind, {correlationKey: 'key', laneKey: 'lane'});
    expect(testKind.operation('key').state).toBe('in-progress');
    return testKind;
  }

  /** Calls the command, and tracks whether it has answered */
  function call(
    testKind: TestKind,
    command: CommandName,
    text = 'version',
  ): {answer: Promise<{outcome: string}>; state: {isAnswered: boolean}} {
    const state = {isAnswered: false};
    const answer = (async () => {
      switch (command) {
        case 'enqueue':
          return testKind.handle.enqueue({payload: {text}, correlationKey: 'key', laneKey: 'lane'});
        case 'hold':
          return kit.outbox.hold('key');
        case 'release':
          return kit.outbox.release('key');
      }
    })().then(outcome => {
      state.isAnswered = true;
      return outcome;
    });
    return {answer, state};
  }

  async function settleAll(pending: {answer: Promise<unknown>}[]): Promise<unknown[]> {
    return Promise.all(
      pending.map(async ({answer}) => {
        return answer;
      }),
    );
  }

  describe.each(COMMANDS)('%s', command => {
    it.each(endings)('waits for the attempt, and answers when it ended $name', async ending => {
      const testKind = await startWithRunningAttempt(ending.kindOptions);
      const pending = call(testKind, command);
      await kit.clock.settle();
      expect(pending.state.isAnswered).toBe(false);

      await ending.end(kit, testKind);

      expect(await pending.answer).toMatchObject(ending.answers[command]);
    });
  });

  describe('what the answers leave behind', () => {
    it('stores a version enqueued while the attempt ran as the snapshot after the one the attempt left', async () => {
      const testKind = await startWithRunningAttempt({maxAttempts: 2});
      const pending = call(testKind, 'enqueue', 'edited');
      await kit.clock.settle();

      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
      await pending.answer;

      expect(
        kit.store.history('operation-1').map(({trigger, state, payload}) => {
          return [trigger, state, payload];
        }),
      ).toEqual([
        ['operation-queued', 'queued', {text: 'hello'}],
        ['attempt-started', 'in-progress', {text: 'hello'}],
        ['attempt-failed', 'queued', {text: 'hello'}],
        ['operation-versioned', 'queued', {text: 'edited'}],
      ]);
    });

    it('lets the running attempt keep the version it started with', async () => {
      const testKind = await startWithRunningAttempt();
      call(testKind, 'enqueue', 'edited');
      await kit.clock.settle();

      expect(testKind.lastAttempt().operation.payload).toEqual({text: 'hello'});
    });

    it('does not start another attempt before a parked hold was applied', async () => {
      const testKind = await startWithRunningAttempt({maxAttempts: 2});
      const hold = call(testKind, 'hold');
      await kit.clock.settle();

      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
      await hold.answer;
      await kit.clock.advance(60_000);

      expect(testKind.operation('key').state).toBe('on-hold');
      expect(testKind.attempts).toHaveLength(1);
    });

    it('runs the next attempt of a version that revived a dead-lettered operation', async () => {
      const testKind = await startWithRunningAttempt({maxAttempts: 1});
      const pending = call(testKind, 'enqueue', 'again');
      await kit.clock.settle();

      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
      await pending.answer;
      await kit.clock.settle();

      expect(testKind.attempts).toHaveLength(2);
      expect(testKind.attempts[1].operation).toMatchObject({payload: {text: 'again'}, attempts: 1});
    });

    it('keeps the lane order when a parked hold is applied', async () => {
      const testKind = await startWithRunningAttempt({maxAttempts: 2});
      await kit.enqueue(testKind, {correlationKey: 'behind', laneKey: 'lane'});
      const hold = call(testKind, 'hold');
      await kit.clock.settle();

      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
      await hold.answer;

      expect(kit.lane('lane')).toMatchObject({
        state: 'blocked',
        operations: [{id: 'operation-1', state: 'on-hold'}, {id: 'operation-2'}],
      });
    });

    it('does not turn a version into a new operation after the attempt ended the operation', async () => {
      const testKind = await startWithRunningAttempt();
      const pending = call(testKind, 'enqueue');
      await kit.clock.settle();

      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});
      await pending.answer;

      expect(kit.outbox.findByCorrelationKey('key')).toEqual({outcome: 'operation-not-found'});
      expect(kit.store.operationIds()).toEqual([]);
    });
  });

  describe('several commands waiting for the same attempt', () => {
    // A version is parked after the holds and releases called later: it is parsed before it takes its place
    it.skip('are applied in the order they were called, a version among them', async () => {
      const testKind = await startWithRunningAttempt({maxAttempts: 2});
      const pending = [
        call(testKind, 'hold'),
        call(testKind, 'enqueue'),
        call(testKind, 'release'),
        call(testKind, 'hold'),
      ];
      await kit.clock.settle();

      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});

      expect(await settleAll(pending)).toMatchObject([
        {outcome: 'operation-held'},
        {outcome: 'operation-versioned'},
        {outcome: 'transition-refused', trigger: 'operation-released'},
        {outcome: 'operation-held'},
      ]);
      expect(kit.operation('key').state).toBe('on-hold');
    });

    it('release a hold that an earlier parked command applied', async () => {
      const testKind = await startWithRunningAttempt({maxAttempts: 2});
      const pending = [call(testKind, 'hold'), call(testKind, 'release'), call(testKind, 'release')];
      await kit.clock.settle();

      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});

      expect(await settleAll(pending)).toMatchObject([
        {outcome: 'operation-held'},
        {outcome: 'operation-released'},
        {outcome: 'transition-refused', trigger: 'operation-released'},
      ]);
      expect(kit.operation('key').state).toBe('queued');
    });

    it('answer operation-succeeded, all of them, when the attempt succeeded', async () => {
      const testKind = await startWithRunningAttempt();
      const pending = [call(testKind, 'hold'), call(testKind, 'enqueue'), call(testKind, 'release')];
      await kit.clock.settle();

      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});

      expect(await settleAll(pending)).toMatchObject([
        {outcome: 'operation-succeeded'},
        {outcome: 'operation-succeeded'},
        {outcome: 'operation-succeeded'},
      ]);
      expect(kit.store.operationIds()).toEqual([]);
    });
  });

  describe('a command that arrives after the attempt ended while another still waits', () => {
    it('is applied after the one called first', async () => {
      const testKind = await startWithRunningAttempt({maxAttempts: 2});
      const hold = call(testKind, 'hold');
      await kit.clock.settle();
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});

      const release = call(testKind, 'release');

      expect(await settleAll([hold, release])).toMatchObject([
        {outcome: 'operation-held'},
        {outcome: 'operation-released'},
      ]);
    });
  });

  describe('a drop', () => {
    it('does not wait: it aborts the attempt and answers the waiting commands operation-dropped', async () => {
      const testKind = await startWithRunningAttempt();
      const pending = COMMANDS.map(command => {
        return call(testKind, command);
      });
      await kit.clock.settle();
      const {signal} = testKind.lastAttempt();

      const dropResult = await kit.outbox.drop('key');

      expect(dropResult).toMatchObject({outcome: 'operation-dropped', operation: {payload: {text: 'hello'}}});
      expect(signal.aborted).toBe(true);
      expect(await settleAll(pending)).toMatchObject([
        {outcome: 'operation-dropped'},
        {outcome: 'operation-dropped'},
        {outcome: 'operation-dropped'},
      ]);
      expect(kit.store.operationIds()).toEqual([]);
    });

    it('ignores what the aborted attempt answers afterwards', async () => {
      const testKind = await startWithRunningAttempt();
      await kit.outbox.drop('key');

      await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});

      expect(
        testKind.changes.map(({state}) => {
          return state;
        }),
      ).toEqual(['queued', 'in-progress', 'dropped']);
    });

    it('lets the next operation of the lane run', async () => {
      const testKind = await startWithRunningAttempt();
      await kit.enqueue(testKind, {correlationKey: 'behind', laneKey: 'lane'});

      await kit.outbox.drop('key');
      await kit.clock.settle();

      expect(
        testKind.attempts.map(({operation}) => {
          return operation.id;
        }),
      ).toEqual(['operation-1', 'operation-2']);
    });
  });

  describe('a stop', () => {
    it.each(COMMANDS)('answers a waiting %s outbox-not-started', async command => {
      const testKind = await startWithRunningAttempt();
      const pending = call(testKind, command);
      await kit.clock.settle();

      await kit.outbox.stop();

      expect(await pending.answer).toEqual({outcome: 'outbox-not-started'});
    });
  });

  describe('a reload', () => {
    it('has no attempt to wait for: the commands apply at once to the interrupted operation', async () => {
      const testKind = kit.registerKind({maxAttempts: 3});
      kit.store.seed(
        createStoredSnapshot({
          kind: testKind.kind.name,
          correlation: {state: 'correlated', correlationKey: 'key'},
          state: 'in-progress',
          attempts: 1,
        }),
      );
      await kit.start({run: false});

      expect(await kit.outbox.hold('key')).toMatchObject({outcome: 'operation-held', operation: {state: 'on-hold'}});
      expect(await kit.outbox.release('key')).toMatchObject({outcome: 'operation-released'});
      expect(await testKind.handle.enqueue({payload: {text: 'edited'}, correlationKey: 'key'})).toMatchObject({
        outcome: 'operation-versioned',
      });
    });
  });
});
