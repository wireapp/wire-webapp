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

describe('createOutbox when perform answers operation-held', () => {
  let kit: OutboxTestKit;
  let testKind: TestKind;

  beforeEach(async () => {
    kit = createOutboxTestKit();
    testKind = kit.registerKind();
    await kit.start();
  });

  afterEach(() => {
    kit.dispose();
  });

  async function enqueue(text: string, orderingKey?: string): Promise<string> {
    const outcome = await kit.enqueue(testKind, {payload: {text}, correlationKey: text, orderingKey});
    return outcome.type === 'operation-queued' ? outcome.operation.id : '';
  }

  function performOf(text: string): TestKind['performs'][number] {
    const found = testKind.performs.find(({operation}) => {
      return operation.payload.text === text;
    });
    if (found === undefined) {
      throw new Error(`${text} was not sent`);
    }
    return found;
  }

  it('ends the attempt and puts the operation on hold, recording operation-held', async () => {
    const id = await enqueue('a');

    await performOf('a').answer({type: 'operation-held'});

    expect(testKind.operation('a')).toMatchObject({state: 'on-hold', attempts: 1});
    expect(kit.store.history(id).at(-1)).toMatchObject({trigger: 'operation-held', state: 'on-hold'});
    expect(
      testKind.changes.map(({state}) => {
        return state;
      }),
    ).toEqual(['queued', 'in-progress', 'on-hold']);
  });

  it('does not send it again until it is released', async () => {
    await enqueue('a');
    await performOf('a').answer({type: 'operation-held'});

    await kit.clock.advance(120_000);

    expect(testKind.performs).toHaveLength(1);
  });

  it('sends it again once released, at once, because a hold is not a failure and does not grow the backoff', async () => {
    await enqueue('a');
    await performOf('a').answer({type: 'operation-held'});

    expect(await kit.outbox.release('a')).toMatchObject({type: 'operation-released'});
    await kit.clock.settle();

    expect(testKind.performs).toHaveLength(2);
    expect(testKind.performs[1].operation).toMatchObject({payload: {text: 'a'}, attempts: 2});
  });

  it('does not make the other operations wait for a backoff', async () => {
    await enqueue('a');
    await performOf('a').answer({type: 'operation-held'});

    await enqueue('b');

    expect(
      testKind.performs.map(({operation}) => {
        return operation.payload.text;
      }),
    ).toEqual(['a', 'b']);
  });

  it('blocks its lane meanwhile, and leaves the other lanes and operations without a lane alone', async () => {
    await enqueue('a', 'lane');
    await enqueue('behind', 'lane');
    await performOf('a').answer({type: 'operation-held'});
    await enqueue('elsewhere', 'other-lane');
    await enqueue('free');

    expect(kit.laneOf('lane')).toMatchObject({status: 'blocked', first: {correlationKey: 'a'}, size: 1});
    expect(
      testKind.performs.map(({operation}) => {
        return operation.payload.text;
      }),
    ).toEqual(['a', 'elsewhere', 'free']);

    await kit.outbox.release('a');
    await kit.clock.settle();
    await testKind.lastPerform().answer({type: 'attempt-succeeded'});

    expect(
      testKind.performs.map(({operation}) => {
        return operation.payload.text;
      }),
    ).toContain('behind');
  });

  it('survives a reload: the operation is still on hold, and nothing is sent', async () => {
    await enqueue('a', 'lane');
    await performOf('a').answer({type: 'operation-held'});
    await kit.outbox.stop();

    await kit.start();

    expect(testKind.operation('a')?.state).toBe('on-hold');
    expect(testKind.performs).toHaveLength(1);
    expect(kit.laneOf('lane')?.status).toBe('blocked');
  });

  describe('commands waiting for the attempt', () => {
    async function startWithWaiting<Outcome>(command: () => Promise<Outcome>): Promise<Promise<Outcome>> {
      await enqueue('a');
      const waiting = command();
      await kit.clock.settle();
      await performOf('a').answer({type: 'operation-held'});
      return waiting;
    }

    it('answers a waiting release by releasing the held operation', async () => {
      const outcome = await startWithWaiting(async () => {
        return kit.outbox.release('a');
      });

      expect(outcome).toMatchObject({type: 'operation-released', operation: {state: 'queued'}});
    });

    it('answers a waiting hold operation-not-queued, as it is on hold already', async () => {
      const outcome = await startWithWaiting(async () => {
        return kit.outbox.hold('a');
      });

      expect(outcome).toMatchObject({type: 'operation-not-queued', operation: {state: 'on-hold'}});
      expect(testKind.operation('a')?.state).toBe('on-hold');
    });

    it('applies a waiting version, which releases the hold', async () => {
      const outcome = await startWithWaiting(async () => {
        return testKind.handle.enqueue({payload: {text: 'edited'}, correlationKey: 'a'});
      });

      expect(outcome).toMatchObject({type: 'operation-versioned', operation: {state: 'queued', attempts: 0}});
    });

    it('answers several waiting commands in order, each to the state the earlier ones left', async () => {
      await enqueue('a');
      const answers: string[] = [];
      const track = async (command: Promise<{type: string}>): Promise<void> => {
        answers.push((await command).type);
      };
      const all = [track(kit.outbox.hold('a')), track(kit.outbox.release('a')), track(kit.outbox.hold('a'))];
      await kit.clock.settle();

      await performOf('a').answer({type: 'operation-held'});
      await Promise.all(all);

      expect(answers).toEqual(['operation-not-queued', 'operation-released', 'operation-held']);
    });
  });
});
