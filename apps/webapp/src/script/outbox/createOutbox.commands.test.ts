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

describe('createOutbox commands', () => {
  let kit: OutboxTestKit;
  let queued: TestKind;

  beforeEach(async () => {
    kit = createOutboxTestKit();
    queued = kit.registerKind({expiresAfterMilliseconds: 10_000});
    await kit.start({run: false});
  });

  afterEach(() => {
    kit.dispose();
  });

  async function enqueue(correlationKey: string, orderingKey?: string): Promise<string> {
    const outcome = await queued.handle.enqueue({payload: {text: correlationKey}, correlationKey, orderingKey});
    return outcome.type === 'operation-queued' ? outcome.operation.id : '';
  }

  function triggersOf(id: string): string[] {
    return kit.store.history(id).map(({trigger, state}) => {
      return `${trigger}>${state}`;
    });
  }

  describe('hold', () => {
    it('puts a queued operation on hold, stored as held', async () => {
      const id = await enqueue('key');

      const outcome = await kit.outbox.hold('key');

      expect(outcome).toMatchObject({type: 'operation-held', operation: {state: 'on-hold'}});
      expect(triggersOf(id)).toEqual(['operation-queued>queued', 'operation-held>on-hold']);
      expect(queued.changes.at(-1)?.state).toBe('on-hold');
    });

    it('answers operation-not-found for an unknown key', async () => {
      expect(await kit.outbox.hold('unknown')).toEqual({type: 'operation-not-found'});
    });

    it('answers operation-not-queued with the operation when it is already on hold', async () => {
      await enqueue('key');
      await kit.outbox.hold('key');

      expect(await kit.outbox.hold('key')).toMatchObject({type: 'operation-not-queued', operation: {state: 'on-hold'}});
    });

    it('answers operation-not-queued when the operation is dead-lettered', async () => {
      await queued.handle.enqueue({payload: {text: 'x'}, correlationKey: 'key', expiresAfterMilliseconds: 100});
      await kit.clock.advance(100);

      expect(await kit.outbox.hold('key')).toMatchObject({
        type: 'operation-not-queued',
        operation: {state: 'dead-lettered'},
      });
    });

    it('answers storage-failed and leaves the operation queued when the store fails', async () => {
      await enqueue('key');
      kit.store.fail('append', true);

      expect(await kit.outbox.hold('key')).toEqual({type: 'storage-failed', errorName: 'TestFailure'});
      expect(queued.operation('key')?.state).toBe('queued');
    });

    it('answers storage-full when the quota is reached', async () => {
      await enqueue('key');
      kit.store.fill(true);

      expect(await kit.outbox.hold('key')).toEqual({type: 'storage-full'});
    });
  });

  describe('release', () => {
    it('queues an operation on hold again, stored as released', async () => {
      const id = await enqueue('key');
      await kit.outbox.hold('key');

      const outcome = await kit.outbox.release('key');

      expect(outcome).toMatchObject({type: 'operation-released', operation: {state: 'queued'}});
      expect(triggersOf(id)).toEqual([
        'operation-queued>queued',
        'operation-held>on-hold',
        'operation-released>queued',
      ]);
    });

    it('answers operation-not-found for an unknown key', async () => {
      expect(await kit.outbox.release('unknown')).toEqual({type: 'operation-not-found'});
    });

    it('answers operation-not-on-hold with the operation when it is queued', async () => {
      await enqueue('key');

      expect(await kit.outbox.release('key')).toMatchObject({
        type: 'operation-not-on-hold',
        operation: {state: 'queued'},
      });
    });

    it('answers storage-failed and leaves the operation on hold when the store fails', async () => {
      await enqueue('key');
      await kit.outbox.hold('key');
      kit.store.fail('append', true);

      expect(await kit.outbox.release('key')).toEqual({type: 'storage-failed', errorName: 'TestFailure'});
      expect(queued.operation('key')?.state).toBe('on-hold');
    });

    it('lets the operation run once released', async () => {
      await enqueue('key');
      await kit.outbox.hold('key');
      kit.outbox.resume();
      await kit.clock.settle();
      expect(queued.performs).toHaveLength(0);

      await kit.outbox.release('key');
      await kit.clock.settle();

      expect(queued.performs).toHaveLength(1);
    });
  });

  describe('drop', () => {
    it.each(['queued', 'on-hold', 'dead-lettered'] as const)('drops an operation that is %s', async state => {
      const id = await enqueue('key');
      if (state === 'on-hold') {
        await kit.outbox.hold('key');
      }
      if (state === 'dead-lettered') {
        await kit.clock.advance(10_000);
      }
      expect(queued.operation('key')?.state).toBe(state);

      const outcome = await kit.outbox.drop('key');

      expect(outcome).toMatchObject({type: 'operation-dropped', operation: {payload: {text: 'key'}}});
      expect(queued.operation('key')).toBeUndefined();
      expect(kit.store.history(id)).toEqual([]);
    });

    it('calls onChanged with the dropped operation', async () => {
      await enqueue('key');

      await kit.outbox.drop('key');

      expect(queued.changes.at(-1)).toMatchObject({state: 'dropped'});
    });

    it('answers operation-not-found for an unknown key, and for one that was dropped', async () => {
      await enqueue('key');
      await kit.outbox.drop('key');

      expect(await kit.outbox.drop('key')).toEqual({type: 'operation-not-found'});
      expect(await kit.outbox.drop('unknown')).toEqual({type: 'operation-not-found'});
    });

    it('answers storage-failed and keeps the operation when its final snapshot cannot be stored', async () => {
      await enqueue('key');
      kit.store.fail('append', true);

      expect(await kit.outbox.drop('key')).toEqual({type: 'storage-failed', errorName: 'TestFailure'});
      expect(queued.operation('key')?.state).toBe('queued');
    });

    it('answers operation-dropped once its final snapshot is stored, although deleting the snapshots failed', async () => {
      const id = await enqueue('key');
      kit.store.fail('remove', true);

      expect(await kit.outbox.drop('key')).toMatchObject({type: 'operation-dropped'});
      expect(queued.operation('key')).toBeUndefined();
      expect(kit.store.history(id).at(-1)).toMatchObject({state: 'dropped'});
    });

    it('lets the key be used again by a new operation', async () => {
      const first = await enqueue('key');
      await kit.outbox.drop('key');

      const second = await enqueue('key');

      expect(second).not.toBe(first);
    });
  });

  describe('lanes', () => {
    it('reads the first operation and the size of a lane', async () => {
      await enqueue('a', 'lane');
      await enqueue('b', 'lane');
      await enqueue('c', 'other');

      expect(kit.laneOf('lane')).toMatchObject({
        orderingKey: 'lane',
        status: 'moving',
        first: {correlationKey: 'a'},
        size: 1,
      });
      expect(kit.outbox.lane('lane')).toMatchObject({type: 'lane-found'});
      expect(
        kit
          .lanesOf()
          .map(({orderingKey}) => {
            return orderingKey;
          })
          .sort(),
      ).toEqual(['lane', 'other']);
    });

    it('is blocked while its first operation is on hold', async () => {
      await enqueue('a', 'lane');
      await kit.outbox.hold('a');

      expect(kit.laneOf('lane')).toMatchObject({
        status: 'blocked',
        first: {correlationKey: 'a', state: 'on-hold'},
      });
    });

    it('is moving again once the hold is released', async () => {
      await enqueue('a', 'lane');
      await kit.outbox.hold('a');
      await kit.outbox.release('a');

      expect(kit.laneOf('lane')?.status).toBe('moving');
    });

    it('skips a dead-lettered operation: it does not block its lane', async () => {
      await queued.handle.enqueue({
        payload: {text: 'a'},
        correlationKey: 'a',
        orderingKey: 'lane',
        expiresAfterMilliseconds: 100,
      });
      await enqueue('b', 'lane');
      await kit.clock.advance(100);

      expect(kit.laneOf('lane')).toMatchObject({first: {correlationKey: 'b'}, size: 0});
    });

    it('has no lane when only dead-lettered operations remain, or none was ever queued', async () => {
      await queued.handle.enqueue({
        payload: {text: 'a'},
        correlationKey: 'a',
        orderingKey: 'lane',
        expiresAfterMilliseconds: 100,
      });
      await kit.clock.advance(100);

      expect(kit.laneOf('lane')).toBeUndefined();
      expect(kit.laneOf('never')).toBeUndefined();
      expect(kit.outbox.lane('lane')).toEqual({type: 'lane-empty'});
      expect(kit.outbox.lane('never')).toEqual({type: 'lane-empty'});
      expect(kit.outbox.lanes()).toEqual({type: 'lanes-listed', lanes: []});
    });

    it('does not make a lane of operations without an ordering key', async () => {
      await enqueue('a');

      expect(kit.lanesOf()).toEqual([]);
    });
  });
});
