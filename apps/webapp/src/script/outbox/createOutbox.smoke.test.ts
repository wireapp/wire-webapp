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

import {isInState} from './tagged';
import {createOutboxTestKit, createStoredSnapshot, type OutboxTestKit} from './testing/createOutboxTestKit';

describe('createOutbox smoke', () => {
  let kit: OutboxTestKit;

  beforeEach(() => {
    kit = createOutboxTestKit();
  });

  it('runs an attempt for an enqueued operation and forgets the operation once it succeeds', async () => {
    const testKind = kit.registerKind();
    await kit.start();

    expect(await kit.enqueue(testKind, {correlationKey: 'key'})).toMatchObject({
      outcome: 'operation-queued',
      operation: {id: 'operation-1', state: 'queued', correlation: {state: 'correlated', correlationKey: 'key'}},
    });
    expect(testKind.lastAttempt().operation).toMatchObject({state: 'in-progress', attempts: 1});

    await testKind.lastAttempt().answer({outcome: 'attempt-succeeded'});

    expect(kit.outbox.findByCorrelationKey('key')).toEqual({outcome: 'operation-not-found'});
    expect(kit.store.operationIds()).toEqual([]);
    expect(testKind.changes.at(-1)).toMatchObject({state: 'succeeded'});
  });

  it('retries a failed attempt after the backoff, measured in stopwatch time', async () => {
    const testKind = kit.registerKind();
    await kit.start();
    await kit.enqueue(testKind, {correlationKey: 'key'});

    await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
    kit.clock.jumpServerTime(60_000);
    await kit.clock.advance(4_999);

    expect(testKind.attempts).toHaveLength(1);
    expect(kit.operation('key')).toMatchObject({state: 'queued', attempts: 1});

    await kit.clock.advance(1);

    expect(testKind.attempts).toHaveLength(2);
    expect(testKind.lastAttempt().operation).toMatchObject({attempts: 2});
  });

  it('expires an operation by server time', async () => {
    const testKind = kit.registerKind({expiresAfterMilliseconds: 60_000});
    await kit.start({run: false});
    await kit.enqueue(testKind, {correlationKey: 'key'});

    // Each enqueue makes the outbox look again, long before the stopwatch reaches the expiry
    kit.clock.jumpServerTime(59_999);
    await kit.enqueue(testKind);
    expect(kit.operation('key').state).toBe('queued');

    kit.clock.jumpServerTime(1);
    await kit.enqueue(testKind);

    expect(kit.operation('key').state).toBe('dead-lettered');
    expect(kit.store.history('operation-1').at(-1)).toMatchObject({trigger: 'operation-expired'});
    expect(testKind.attempts).toHaveLength(0);
  });

  it('versions the operation with the same correlation key', async () => {
    const testKind = kit.registerKind();
    await kit.start({run: false});
    await kit.enqueue(testKind, {correlationKey: 'key', payload: {text: 'first'}});

    expect(await kit.enqueue(testKind, {correlationKey: 'key', payload: {text: 'second'}})).toMatchObject({
      outcome: 'operation-versioned',
      operation: {id: 'operation-1', payload: {text: 'second'}},
    });
    expect(
      kit.store.history('operation-1').map(({trigger, payload}) => {
        return [trigger, payload];
      }),
    ).toEqual([
      ['operation-queued', {text: 'first'}],
      ['operation-versioned', {text: 'second'}],
    ]);
  });

  it('parks a hold on the running attempt, and applies it once the attempt ends', async () => {
    const testKind = kit.registerKind();
    await kit.start();
    await kit.enqueue(testKind, {correlationKey: 'key'});
    let isAnswered = false;

    const holdResult = kit.outbox.hold('key').finally(() => {
      isAnswered = true;
    });
    await kit.clock.settle();
    expect(isAnswered).toBe(false);

    await testKind.lastAttempt().answer({outcome: 'attempt-failed'});

    expect(await holdResult).toMatchObject({outcome: 'operation-held', operation: {state: 'on-hold'}});
    expect(
      kit.store.history('operation-1').map(({trigger}) => {
        return trigger;
      }),
    ).toEqual(['operation-queued', 'attempt-started', 'attempt-failed', 'operation-held']);
  });

  it('drops an operation at once, aborting its running attempt and ignoring its late answer', async () => {
    const testKind = kit.registerKind();
    await kit.start();
    await kit.enqueue(testKind, {correlationKey: 'key'});
    const attempt = testKind.lastAttempt();

    expect(await kit.outbox.drop('key')).toMatchObject({outcome: 'operation-dropped', operation: {state: 'dropped'}});
    expect(attempt.signal.aborted).toBe(true);

    await attempt.answer({outcome: 'attempt-succeeded'});

    expect(kit.outbox.findByCorrelationKey('key')).toEqual({outcome: 'operation-not-found'});
    expect(kit.store.operationIds()).toEqual([]);
  });

  it("ends the operations of the kind behind one given up by its attempt, when the kind's lane follows", async () => {
    const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
    await kit.start();
    await kit.enqueue(testKind, {correlationKey: 'first', laneKey: 'lane'});
    await kit.enqueue(testKind, {correlationKey: 'second', laneKey: 'lane'});
    await kit.enqueue(testKind, {correlationKey: 'third', laneKey: 'lane'});

    await testKind.lastAttempt().answer({outcome: 'attempt-dead-lettered'});

    expect(testKind.attempts).toHaveLength(1);
    expect(kit.operation('first').state).toBe('dead-lettered');
    expect(kit.store.history('operation-2').at(-1)).toMatchObject({
      state: 'dead-lettered',
      trigger: 'lane-dead-lettered',
    });
    expect(kit.store.history('operation-3').at(-1)).toMatchObject({
      state: 'dead-lettered',
      trigger: 'lane-dead-lettered',
    });
  });

  it("drops the operations of the kind behind one the owner drops, when the kind's lane follows", async () => {
    const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
    await kit.start({run: false});
    await kit.enqueue(testKind, {correlationKey: 'first', laneKey: 'lane'});
    await kit.enqueue(testKind, {correlationKey: 'second', laneKey: 'lane'});

    await kit.outbox.drop('first');

    expect(kit.outbox.lanes()).toEqual({outcome: 'lanes-listed', lanes: []});
    expect(
      testKind.changes.filter(isInState('dropped')).map(({id}) => {
        return id;
      }),
    ).toEqual(['operation-2', 'operation-1']);
  });

  it('does not cascade from an operation that was dead-lettered already', async () => {
    const testKind = kit.registerKind({laneWhenGivenUp: 'follows'});
    await kit.start();
    await kit.enqueue(testKind, {correlationKey: 'first', laneKey: 'lane'});
    await testKind.lastAttempt().answer({outcome: 'attempt-dead-lettered'});
    kit.outbox.pause();
    await kit.enqueue(testKind, {correlationKey: 'second', laneKey: 'lane'});

    await kit.outbox.drop('first');

    expect(kit.operation('second').state).toBe('queued');
    expect(kit.lane('lane').operations).toMatchObject([{id: 'operation-2'}]);
  });

  it('loads an operation whose attempt was running as interrupted, and retries it', async () => {
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

    expect(kit.store.history('stored-operation').at(-2)).toMatchObject({
      state: 'queued',
      trigger: 'attempt-interrupted',
    });
    expect(testKind.lastAttempt().operation).toMatchObject({id: 'stored-operation', attempts: 2});
  });

  it('answers a store failure and leaves the operation as it was', async () => {
    const testKind = kit.registerKind();
    await kit.start({run: false});
    await kit.enqueue(testKind, {correlationKey: 'key'});
    kit.store.fail('append', true);

    expect(await kit.outbox.hold('key')).toEqual({outcome: 'storage-failed', errorName: 'TestFailure'});
    expect(kit.operation('key').state).toBe('queued');
    expect(kit.store.history('operation-1')).toHaveLength(1);
  });

  it('answers the commands parked on a running attempt outbox-not-started when it stops', async () => {
    const testKind = kit.registerKind({attemptTimeoutMilliseconds: 10_000});
    await kit.start();
    await kit.enqueue(testKind, {correlationKey: 'key'});
    const holdResult = kit.outbox.hold('key');
    await kit.clock.settle();

    await kit.outbox.stop();

    expect(await holdResult).toEqual({outcome: 'outbox-not-started'});
    expect(testKind.lastAttempt().signal.aborted).toBe(true);
    expect(kit.clock.pendingTimers()).toEqual([]);
    expect(kit.store.history('operation-1').at(-1)).toMatchObject({state: 'in-progress'});
  });
});
