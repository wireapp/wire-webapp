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
  expected: Record<CommandName, string>;
};

const succeeded = {enqueue: 'operation-succeeded', hold: 'operation-succeeded', release: 'operation-succeeded'};
const dropped = {enqueue: 'operation-dropped', hold: 'operation-dropped', release: 'operation-dropped'};
/** The operation is queued again, so a version replaces it, a hold holds it and a release has nothing to release */
const queuedAgain = {enqueue: 'operation-versioned', hold: 'operation-held', release: 'operation-not-on-hold'};
/** The operation is dead-lettered: only a version revives it */
const deadLettered = {enqueue: 'operation-versioned', hold: 'operation-not-queued', release: 'operation-not-on-hold'};

const failures: {name: string; kindOptions: KindOptions; end: Ending['end']}[] = [
  {
    name: 'failed',
    kindOptions: {},
    end: async (_, testKind) => {
      return testKind.lastPerform().answer({type: 'attempt-failed'});
    },
  },
  {
    name: 'timed out',
    kindOptions: {performTimeoutMilliseconds: 1_000},
    end: async kit => {
      return kit.clock.advance(1_000);
    },
  },
  {
    name: 'errored',
    kindOptions: {},
    end: async (_, testKind) => {
      return testKind.lastPerform().reject(new Error('failed'));
    },
  },
];

const limits: {name: string; kindOptions: KindOptions; expected: Ending['expected']}[] = [
  {name: 'with attempts left', kindOptions: {maxAttempts: 2}, expected: queuedAgain},
  {name: 'without attempts left, dead-lettering', kindOptions: {maxAttempts: 1}, expected: deadLettered},
  {name: 'without attempts left, dropping', kindOptions: {maxAttempts: 1, whenGivenUp: 'drop'}, expected: dropped},
];

const endings: Ending[] = [
  {
    name: 'succeeded',
    kindOptions: {},
    end: async (_, testKind) => {
      return testKind.lastPerform().answer({type: 'attempt-succeeded'});
    },
    expected: succeeded,
  },
  ...failures.flatMap(failure => {
    return limits.map(limit => {
      return {
        name: `${failure.name} ${limit.name}`,
        kindOptions: {...failure.kindOptions, ...limit.kindOptions},
        end: failure.end,
        expected: limit.expected,
      };
    });
  }),
  {
    name: 'dead-lettered by perform',
    kindOptions: {},
    end: async (_, testKind) => {
      return testKind.lastPerform().answer({type: 'operation-dead-lettered'});
    },
    expected: deadLettered,
  },
  {
    name: 'dropped by perform',
    kindOptions: {},
    end: async (_, testKind) => {
      return testKind.lastPerform().answer({type: 'operation-dropped'});
    },
    expected: dropped,
  },
];

describe('createOutbox commands on an operation with an attempt running', () => {
  let kit: OutboxTestKit;

  beforeEach(() => {
    kit = createOutboxTestKit();
  });

  afterEach(() => {
    kit.dispose();
  });

  async function startWithRunningAttempt(kindOptions: KindOptions = {}): Promise<TestKind> {
    const testKind = kit.registerKind(kindOptions);
    await kit.start();
    await kit.enqueue(testKind, {correlationKey: 'key', orderingKey: 'lane'});
    expect(testKind.operation('key')?.state).toBe('in-progress');
    return testKind;
  }

  /** Calls the command, and tracks whether it has answered */
  function call(
    testKind: TestKind,
    command: CommandName,
    text = 'version',
  ): {answer: Promise<{type: string}>; hasAnswered: () => boolean} {
    const answers: {type: string}[] = [];
    const answer = callCommand(command, testKind, text).then(outcome => {
      answers.push(outcome);
      return outcome;
    });
    return {
      answer,
      hasAnswered: () => {
        return answers.length > 0;
      },
    };
  }

  async function callCommand(command: CommandName, testKind: TestKind, text: string): Promise<{type: string}> {
    switch (command) {
      case 'enqueue':
        return testKind.handle.enqueue({payload: {text}, correlationKey: 'key', orderingKey: 'lane'});
      case 'hold':
        return kit.outbox.hold('key');
      case 'release':
        return kit.outbox.release('key');
    }
  }

  describe.each(['enqueue', 'hold', 'release'] as const)('%s', command => {
    it.each(endings)('waits for the attempt, and answers when it ended $name', async ending => {
      const testKind = await startWithRunningAttempt(ending.kindOptions);
      const pending = call(testKind, command);
      await kit.clock.settle();
      expect(pending.hasAnswered()).toBe(false);

      await ending.end(kit, testKind);

      expect(await pending.answer).toMatchObject({type: ending.expected[command]});
    });
  });

  describe('what the answers leave behind', () => {
    it('stores a version enqueued while the attempt ran as the next snapshot after the attempt ended', async () => {
      const testKind = await startWithRunningAttempt({maxAttempts: 2});
      const pending = call(testKind, 'enqueue', 'edited');
      await kit.clock.settle();

      await testKind.lastPerform().answer({type: 'attempt-failed'});
      await pending.answer;

      const id = testKind.operation('key')?.id ?? '';
      expect(
        kit.store.history(id).map(({trigger, state, payload}) => {
          return [trigger, state, payload];
        }),
      ).toEqual([
        ['operation-queued', 'queued', {text: 'hello'}],
        ['attempt-started', 'in-progress', {text: 'hello'}],
        ['attempt-failed', 'queued', {text: 'hello'}],
        ['operation-versioned', 'queued', {text: 'edited'}],
      ]);
    });

    it('lets the attempt keep the version it started with', async () => {
      const testKind = await startWithRunningAttempt();
      call(testKind, 'enqueue', 'edited');
      await kit.clock.settle();

      expect(testKind.lastPerform().operation.payload).toEqual({text: 'hello'});
    });

    it('does not start another attempt before the waiting commands were applied', async () => {
      const testKind = await startWithRunningAttempt({maxAttempts: 2});
      const hold = call(testKind, 'hold');
      await kit.clock.settle();

      await testKind.lastPerform().answer({type: 'attempt-failed'});
      await hold.answer;
      await kit.clock.advance(60_000);

      expect(testKind.operation('key')?.state).toBe('on-hold');
      expect(testKind.performs).toHaveLength(1);
    });

    it('runs the next attempt of a version that revived a dead-lettered operation', async () => {
      const testKind = await startWithRunningAttempt({maxAttempts: 1});
      const pending = call(testKind, 'enqueue', 'again');
      await kit.clock.settle();

      await testKind.lastPerform().answer({type: 'attempt-failed'});
      await pending.answer;
      await kit.clock.settle();

      expect(testKind.performs).toHaveLength(2);
      expect(testKind.performs[1].operation).toMatchObject({payload: {text: 'again'}, attempts: 1});
    });

    it('applies a waiting command to the operation as the attempt left it, and keeps the lane order', async () => {
      const testKind = await startWithRunningAttempt({maxAttempts: 2});
      await kit.enqueue(testKind, {correlationKey: 'behind', orderingKey: 'lane'});
      const hold = call(testKind, 'hold');
      await kit.clock.settle();

      await testKind.lastPerform().answer({type: 'attempt-failed'});
      await hold.answer;

      expect(kit.laneOf('lane')).toMatchObject({status: 'blocked', first: {correlationKey: 'key'}, size: 1});
    });
  });

  describe('a drop', () => {
    it('does not wait: it aborts the attempt, and the waiting commands answer operation-dropped', async () => {
      const testKind = await startWithRunningAttempt();
      const waiting = (['enqueue', 'hold', 'release'] as const).map(command => {
        return call(testKind, command);
      });
      await kit.clock.settle();
      const {signal} = testKind.lastPerform();

      const dropOutcome = await kit.outbox.drop('key');

      expect(dropOutcome).toMatchObject({type: 'operation-dropped', operation: {payload: {text: 'hello'}}});
      expect(signal.aborted).toBe(true);
      const answers = await Promise.all(
        waiting.map(async ({answer}) => {
          return answer;
        }),
      );
      expect(
        answers.map(({type}) => {
          return type;
        }),
      ).toEqual(['operation-dropped', 'operation-dropped', 'operation-dropped']);
      expect(testKind.operation('key')).toBeUndefined();
      expect(kit.store.operationIds()).toEqual([]);
    });

    it('ignores what the aborted attempt answers afterwards', async () => {
      const testKind = await startWithRunningAttempt();
      await kit.outbox.drop('key');

      await testKind.lastPerform().answer({type: 'attempt-succeeded'});

      expect(
        testKind.changes.map(({state}) => {
          return state;
        }),
      ).toEqual(['queued', 'in-progress', 'dropped']);
    });

    it('lets the next operation of the lane run', async () => {
      const testKind = await startWithRunningAttempt();
      await kit.enqueue(testKind, {correlationKey: 'behind', orderingKey: 'lane'});

      await kit.outbox.drop('key');
      await kit.clock.settle();

      expect(
        testKind.performs.map(({operation}) => {
          return operation.correlationKey;
        }),
      ).toEqual(['key', 'behind']);
    });
  });

  describe('a stop', () => {
    it.each(['enqueue', 'hold', 'release'] as const)('answers outbox-not-started to a waiting %s', async command => {
      const testKind = await startWithRunningAttempt();
      const pending = call(testKind, command);
      await kit.clock.settle();

      await kit.outbox.stop();

      expect(await pending.answer).toEqual({type: 'outbox-not-started'});
    });
  });

  describe('a reload', () => {
    it('has no attempt to wait for: the commands apply at once to the operation that was interrupted', async () => {
      const testKind = kit.registerKind({maxAttempts: 3});
      kit.store.seed(
        createStoredSnapshot({kind: testKind.kind.name, correlationKey: 'key', state: 'in-progress', attempts: 1}),
      );
      await kit.start({run: false});

      expect(await kit.outbox.hold('key')).toMatchObject({type: 'operation-held', operation: {state: 'on-hold'}});
      expect(await kit.outbox.release('key')).toMatchObject({type: 'operation-released'});
      expect(await testKind.handle.enqueue({payload: {text: 'edited'}, correlationKey: 'key'})).toMatchObject({
        type: 'operation-versioned',
      });
    });
  });

  describe('several commands waiting for the same attempt', () => {
    it('are answered, and applied, in the order they were called', async () => {
      const testKind = await startWithRunningAttempt({maxAttempts: 2});
      const answered: string[] = [];
      const track = async (command: CommandName): Promise<void> => {
        const outcome = await call(testKind, command).answer;
        answered.push(`${command}:${outcome.type}`);
      };
      const all = [track('hold'), track('enqueue'), track('release'), track('hold')];
      await kit.clock.settle();

      await testKind.lastPerform().answer({type: 'attempt-failed'});
      await Promise.all(all);

      expect(answered).toEqual([
        'hold:operation-held',
        'enqueue:operation-versioned',
        'release:operation-not-on-hold',
        'hold:operation-held',
      ]);
      expect(testKind.operation('key')?.state).toBe('on-hold');
    });

    it('apply to the state the earlier ones left, as if called then', async () => {
      const testKind = await startWithRunningAttempt({maxAttempts: 2});
      const hold = call(testKind, 'hold');
      const release = call(testKind, 'release');
      const secondRelease = call(testKind, 'release');
      await kit.clock.settle();

      await testKind.lastPerform().answer({type: 'attempt-failed'});

      expect((await hold.answer).type).toBe('operation-held');
      expect((await release.answer).type).toBe('operation-released');
      expect((await secondRelease.answer).type).toBe('operation-not-on-hold');
      expect(testKind.operation('key')?.state).toBe('queued');
    });

    it('are all answered operation-succeeded when the attempt succeeded', async () => {
      const testKind = await startWithRunningAttempt();
      const waiting = (['hold', 'enqueue', 'release'] as const).map(command => {
        return call(testKind, command);
      });
      await kit.clock.settle();

      await testKind.lastPerform().answer({type: 'attempt-succeeded'});

      const answers = await Promise.all(
        waiting.map(async ({answer}) => {
          return answer;
        }),
      );
      expect(
        answers.map(({type}) => {
          return type;
        }),
      ).toEqual(['operation-succeeded', 'operation-succeeded', 'operation-succeeded']);
      expect(kit.store.operationIds()).toEqual([]);
    });

    it('never turn a version into a new operation after the attempt ended the operation', async () => {
      const testKind = await startWithRunningAttempt();
      const pending = call(testKind, 'enqueue');
      await kit.clock.settle();

      await testKind.lastPerform().answer({type: 'attempt-succeeded'});
      await pending.answer;

      expect(testKind.operation('key')).toBeUndefined();
      expect(kit.store.operationIds()).toEqual([]);
    });
  });

  describe('a command that arrives while another waits and the attempt has ended', () => {
    it('waits behind the commands that were called first', async () => {
      const testKind = await startWithRunningAttempt({maxAttempts: 2});
      const hold = call(testKind, 'hold');
      await kit.clock.settle();
      await testKind.lastPerform().answer({type: 'attempt-failed'});

      const release = call(testKind, 'release');
      await Promise.all([hold.answer, release.answer]);

      expect((await hold.answer).type).toBe('operation-held');
      expect((await release.answer).type).toBe('operation-released');
    });
  });
});
