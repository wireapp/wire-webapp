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
import type {OperationState} from './types';

type CommandState = Extract<OperationState, 'queued' | 'on-hold' | 'in-progress' | 'dead-lettered'>;

describe('createOutbox commands', () => {
  let kit: OutboxTestKit;
  let testKind: TestKind;

  beforeEach(async () => {
    kit = createOutboxTestKit();
    testKind = kit.registerKind({expiresAfterMilliseconds: 10_000});
    await kit.start({run: false});
  });

  afterEach(async () => {
    await kit.outbox.stop();
  });

  async function enqueue(correlationKey: string, laneKey?: string): Promise<void> {
    await testKind.handle.enqueue({payload: {text: correlationKey}, correlationKey, laneKey});
  }

  /** Brings the operation `key` into the state; `in-progress` leaves its attempt unanswered */
  async function putInState(state: CommandState): Promise<void> {
    await enqueue('key');
    if (state === 'on-hold') {
      await kit.outbox.hold('key');
    }
    if (state === 'dead-lettered') {
      await kit.clock.advance(10_000);
    }
    if (state === 'in-progress') {
      kit.outbox.resume();
      await kit.clock.settle();
    }
    expect(kit.operation('key').state).toBe(state);
  }

  function triggersOf(operationId: string): string[] {
    return kit.store.history(operationId).map(({trigger, state}) => {
      return `${trigger}>${state}`;
    });
  }

  describe('hold', () => {
    it('puts a queued operation on hold', async () => {
      await enqueue('key');

      expect(await kit.outbox.hold('key')).toMatchObject({
        outcome: 'operation-held',
        operation: {id: 'operation-1', state: 'on-hold'},
      });
    });

    it('stores the hold and calls onChanged', async () => {
      await enqueue('key');

      await kit.outbox.hold('key');

      expect(triggersOf('operation-1')).toEqual(['operation-queued>queued', 'operation-held>on-hold']);
      expect(testKind.changes.at(-1)).toMatchObject({state: 'on-hold'});
    });

    it('keeps the attempts and the payload of the operation', async () => {
      await enqueue('key');

      expect(await kit.outbox.hold('key')).toMatchObject({operation: {attempts: 0, payload: {text: 'key'}}});
    });

    it('answers operation-not-found for an unknown key', async () => {
      expect(await kit.outbox.hold('unknown')).toEqual({outcome: 'operation-not-found'});
    });

    it.each(['on-hold', 'dead-lettered'] as const)('refuses an operation that is %s', async state => {
      await putInState(state);

      expect(await kit.outbox.hold('key')).toEqual({
        outcome: 'transition-refused',
        operation: expect.objectContaining({state}),
        trigger: 'operation-held',
      });
    });

    it('stores nothing when it refuses', async () => {
      await putInState('on-hold');

      await kit.outbox.hold('key');

      expect(triggersOf('operation-1')).toEqual(['operation-queued>queued', 'operation-held>on-hold']);
    });

    it('is not taken before the outbox is started', async () => {
      const notStartedKit = createOutboxTestKit();

      expect(await notStartedKit.outbox.hold('key')).toEqual({outcome: 'outbox-not-started'});
    });

    it('answers storage-failed and leaves the operation queued when the store fails', async () => {
      await enqueue('key');
      kit.store.fail('append', true);

      expect(await kit.outbox.hold('key')).toEqual({outcome: 'storage-failed', errorName: 'TestFailure'});
      expect(kit.operation('key').state).toBe('queued');
    });

    it('answers storage-full and leaves the operation queued when the quota is reached', async () => {
      await enqueue('key');
      kit.store.fill(true);

      expect(await kit.outbox.hold('key')).toEqual({outcome: 'storage-full'});
      expect(kit.operation('key').state).toBe('queued');
    });
  });

  describe('release', () => {
    it('queues an operation on hold again', async () => {
      await putInState('on-hold');

      expect(await kit.outbox.release('key')).toMatchObject({
        outcome: 'operation-released',
        operation: {id: 'operation-1', state: 'queued'},
      });
    });

    it('stores the release and calls onChanged', async () => {
      await putInState('on-hold');

      await kit.outbox.release('key');

      expect(triggersOf('operation-1')).toEqual([
        'operation-queued>queued',
        'operation-held>on-hold',
        'operation-released>queued',
      ]);
      expect(testKind.changes.at(-1)).toMatchObject({state: 'queued'});
    });

    it('answers operation-not-found for an unknown key', async () => {
      expect(await kit.outbox.release('unknown')).toEqual({outcome: 'operation-not-found'});
    });

    it.each(['queued', 'dead-lettered'] as const)('refuses an operation that is %s', async state => {
      await putInState(state);

      expect(await kit.outbox.release('key')).toEqual({
        outcome: 'transition-refused',
        operation: expect.objectContaining({state}),
        trigger: 'operation-released',
      });
    });

    it('lets the operation run once released', async () => {
      await putInState('on-hold');
      kit.outbox.resume();
      await kit.clock.settle();
      expect(testKind.attempts).toEqual([]);

      await kit.outbox.release('key');
      await kit.clock.settle();

      expect(testKind.lastAttempt().operation).toMatchObject({id: 'operation-1', attempts: 1});
    });

    it('is not taken before the outbox is started', async () => {
      const notStartedKit = createOutboxTestKit();

      expect(await notStartedKit.outbox.release('key')).toEqual({outcome: 'outbox-not-started'});
    });

    it('answers storage-failed and leaves the operation on hold when the store fails', async () => {
      await putInState('on-hold');
      kit.store.fail('append', true);

      expect(await kit.outbox.release('key')).toEqual({outcome: 'storage-failed', errorName: 'TestFailure'});
      expect(kit.operation('key').state).toBe('on-hold');
    });

    it('answers storage-full and leaves the operation on hold when the quota is reached', async () => {
      await putInState('on-hold');
      kit.store.fill(true);

      expect(await kit.outbox.release('key')).toEqual({outcome: 'storage-full'});
      expect(kit.operation('key').state).toBe('on-hold');
    });
  });

  describe('deadLetter', () => {
    it.each(['queued', 'on-hold', 'in-progress'] as const)('dead-letters an operation that is %s', async state => {
      await putInState(state);

      expect(await kit.outbox.deadLetter('key')).toMatchObject({
        outcome: 'operation-dead-lettered',
        operation: {id: 'operation-1', state: 'dead-lettered', payload: {text: 'key'}},
      });
      expect(kit.operation('key').state).toBe('dead-lettered');
      expect(kit.store.history('operation-1').at(-1)).toMatchObject({
        trigger: 'operation-dead-lettered',
        state: 'dead-lettered',
      });
      expect(testKind.changes.at(-1)).toMatchObject({id: 'operation-1', state: 'dead-lettered'});
    });

    it('refuses an operation that is dead-lettered already', async () => {
      await putInState('dead-lettered');

      expect(await kit.outbox.deadLetter('key')).toEqual({
        outcome: 'transition-refused',
        trigger: 'operation-dead-lettered',
        operation: expect.objectContaining({state: 'dead-lettered'}),
      });
    });

    it('aborts the running attempt, does not wait for it, and ignores its late answer', async () => {
      await putInState('in-progress');
      const attempt = testKind.lastAttempt();

      expect(await kit.outbox.deadLetter('key')).toMatchObject({outcome: 'operation-dead-lettered'});
      await attempt.answer({outcome: 'attempt-succeeded'});

      expect(attempt.signal.aborted).toBe(true);
      expect(kit.operation('key').state).toBe('dead-lettered');
    });

    it('can be revived by a version', async () => {
      await enqueue('key');
      await kit.outbox.deadLetter('key');

      expect(await testKind.handle.enqueue({payload: {text: 'again'}, correlationKey: 'key'})).toMatchObject({
        outcome: 'operation-versioned',
        operation: {id: 'operation-1', state: 'queued'},
      });
    });

    it('answers operation-not-found for an unknown key', async () => {
      expect(await kit.outbox.deadLetter('unknown')).toEqual({outcome: 'operation-not-found'});
    });

    it('is not taken before the outbox is started', async () => {
      const notStartedKit = createOutboxTestKit();

      expect(await notStartedKit.outbox.deadLetter('key')).toEqual({outcome: 'outbox-not-started'});
    });

    it('answers storage-failed, keeps the operation and leaves the attempt running when it cannot be stored', async () => {
      await putInState('in-progress');
      kit.store.fail('append', true);

      expect(await kit.outbox.deadLetter('key')).toEqual({outcome: 'storage-failed', errorName: 'TestFailure'});
      expect(kit.operation('key').state).toBe('in-progress');
      expect(testKind.lastAttempt().signal.aborted).toBe(false);
    });
  });

  describe('delete', () => {
    it.each(['queued', 'on-hold', 'in-progress', 'dead-lettered'] as const)(
      'deletes an operation that is %s',
      async state => {
        await putInState(state);

        expect(await kit.outbox.delete('key')).toMatchObject({
          outcome: 'operation-deleted',
          operation: {id: 'operation-1', state: 'deleted', payload: {text: 'key'}},
        });
        expect(kit.outbox.findByCorrelationKey('key')).toEqual({outcome: 'operation-not-found'});
      },
    );

    it('deletes every snapshot of the operation', async () => {
      await enqueue('key');

      await kit.outbox.delete('key');

      expect(kit.store.operationIds()).toEqual([]);
      expect(kit.store.calls.at(-1)).toEqual({method: 'remove', operationIds: ['operation-1']});
    });

    it('stores the final snapshot before deleting the snapshots', async () => {
      await enqueue('key');

      await kit.outbox.delete('key');

      expect(kit.store.calls.slice(-2)).toEqual([
        {method: 'append', snapshot: expect.objectContaining({trigger: 'operation-deleted', state: 'deleted'})},
        {method: 'remove', operationIds: ['operation-1']},
      ]);
    });

    it('calls onChanged with the deleted operation', async () => {
      await enqueue('key');

      await kit.outbox.delete('key');

      expect(testKind.changes.at(-1)).toMatchObject({id: 'operation-1', state: 'deleted'});
    });

    it('aborts the running attempt of an operation that is in progress', async () => {
      await putInState('in-progress');
      const {signal} = testKind.lastAttempt();

      await kit.outbox.delete('key');

      expect(signal.aborted).toBe(true);
    });

    it('does not wait for the running attempt', async () => {
      await putInState('in-progress');

      expect(await kit.outbox.delete('key')).toMatchObject({outcome: 'operation-deleted'});
      expect(testKind.attempts).toHaveLength(1);
    });

    it('answers operation-not-found for an unknown key', async () => {
      expect(await kit.outbox.delete('unknown')).toEqual({outcome: 'operation-not-found'});
    });

    it('answers operation-not-found for an operation that was deleted already', async () => {
      await enqueue('key');
      await kit.outbox.delete('key');

      expect(await kit.outbox.delete('key')).toEqual({outcome: 'operation-not-found'});
    });

    it('is not taken before the outbox is started', async () => {
      const notStartedKit = createOutboxTestKit();

      expect(await notStartedKit.outbox.delete('key')).toEqual({outcome: 'outbox-not-started'});
    });

    it('answers storage-failed and keeps the operation when the final snapshot cannot be stored', async () => {
      await enqueue('key');
      kit.store.fail('append', true);

      expect(await kit.outbox.delete('key')).toEqual({outcome: 'storage-failed', errorName: 'TestFailure'});
      expect(kit.operation('key').state).toBe('queued');
    });

    it('answers storage-full and keeps the operation when the quota is reached', async () => {
      await enqueue('key');
      kit.store.fill(true);

      expect(await kit.outbox.delete('key')).toEqual({outcome: 'storage-full'});
      expect(kit.operation('key').state).toBe('queued');
    });

    it('leaves the attempt running when the final snapshot cannot be stored', async () => {
      await putInState('in-progress');
      kit.store.fail('append', true);

      await kit.outbox.delete('key');

      expect(testKind.lastAttempt().signal.aborted).toBe(false);
    });

    it('answers operation-deleted once the final snapshot is stored, although deleting the snapshots failed', async () => {
      await enqueue('key');
      kit.store.fail('remove', true);

      expect(await kit.outbox.delete('key')).toMatchObject({outcome: 'operation-deleted'});
      expect(kit.outbox.findByCorrelationKey('key')).toEqual({outcome: 'operation-not-found'});
      expect(kit.store.history('operation-1').at(-1)).toMatchObject({state: 'deleted'});
    });

    it('lets the key be used again by a new operation', async () => {
      await enqueue('key');
      await kit.outbox.delete('key');

      expect(await testKind.handle.enqueue({payload: {text: 'again'}, correlationKey: 'key'})).toMatchObject({
        outcome: 'operation-queued',
        operation: {id: 'operation-2'},
      });
    });
  });

  describe('lanes', () => {
    it('reads the operations of a lane in lane order, and not those of other lanes', async () => {
      await enqueue('a', 'lane');
      await enqueue('b', 'lane');
      await enqueue('c', 'other');

      expect(kit.outbox.lane('lane')).toEqual({
        outcome: 'lane-found',
        lane: {
          state: 'moving',
          laneKey: 'lane',
          operations: [expect.objectContaining({id: 'operation-1'}), expect.objectContaining({id: 'operation-2'})],
        },
      });
    });

    it('lists every lane', async () => {
      await enqueue('a', 'lane');
      await enqueue('c', 'other');

      expect(kit.outbox.lanes()).toMatchObject({
        outcome: 'lanes-listed',
        lanes: [expect.objectContaining({laneKey: 'lane'}), expect.objectContaining({laneKey: 'other'})],
      });
    });

    it('is blocked while its first operation is on hold', async () => {
      await enqueue('a', 'lane');
      await kit.outbox.hold('a');

      expect(kit.lane('lane')).toMatchObject({state: 'blocked', operations: [{id: 'operation-1', state: 'on-hold'}]});
    });

    it('is moving again once the hold is released', async () => {
      await enqueue('a', 'lane');
      await kit.outbox.hold('a');
      await kit.outbox.release('a');

      expect(kit.lane('lane').state).toBe('moving');
    });

    it('does not count a dead-lettered operation: it does not block its lane', async () => {
      await testKind.handle.enqueue({
        payload: {text: 'a'},
        correlationKey: 'a',
        laneKey: 'lane',
        expiresAfterMilliseconds: 100,
      });
      await enqueue('b', 'lane');
      await kit.clock.advance(100);

      expect(kit.lane('lane').operations).toEqual([expect.objectContaining({id: 'operation-2'})]);
    });

    it('is empty when only dead-lettered operations remain, or none was ever queued', async () => {
      await testKind.handle.enqueue({
        payload: {text: 'a'},
        correlationKey: 'a',
        laneKey: 'lane',
        expiresAfterMilliseconds: 100,
      });
      await kit.clock.advance(100);

      expect(kit.outbox.lane('lane')).toEqual({outcome: 'lane-empty'});
      expect(kit.outbox.lane('never')).toEqual({outcome: 'lane-empty'});
      expect(kit.outbox.lanes()).toEqual({outcome: 'lanes-listed', lanes: []});
    });

    it('does not make a lane of operations without a lane key', async () => {
      await enqueue('a');

      expect(kit.outbox.lanes()).toEqual({outcome: 'lanes-listed', lanes: []});
    });

    it('is not read before the outbox is started', () => {
      const notStartedKit = createOutboxTestKit();

      expect(notStartedKit.outbox.lane('lane')).toEqual({outcome: 'outbox-not-started'});
      expect(notStartedKit.outbox.lanes()).toEqual({outcome: 'outbox-not-started'});
    });
  });
});
