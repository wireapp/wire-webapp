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
import type {EnqueueOutcome} from './types';

function operationIdOf(outcome: EnqueueOutcome<unknown>): string {
  if (outcome.type === 'operation-queued' || outcome.type === 'operation-versioned') {
    return outcome.operation.id;
  }
  throw new Error(`No operation in ${outcome.type}`);
}

describe('createOutbox enqueue', () => {
  let kit: OutboxTestKit;
  let queued: TestKind;
  let other: TestKind;
  let parsing: TestKind;
  let expiring: TestKind;

  beforeEach(async () => {
    kit = createOutboxTestKit();
    queued = kit.registerKind();
    other = kit.registerKind();
    parsing = kit.registerKind({
      parsePayload: value => {
        return {text: `${parseText(value)}!`};
      },
    });
    expiring = kit.registerKind({expiresAfterMilliseconds: 10_000});
    await kit.start({run: false});
  });

  afterEach(() => {
    kit.dispose();
  });

  describe('a new operation', () => {
    it('is queued and answers the operation as it was left', async () => {
      const outcome = await queued.handle.enqueue({payload: {text: 'hi'}, correlationKey: 'key'});

      expect(outcome).toMatchObject({
        type: 'operation-queued',
        operation: {kind: queued.kind.name, payload: {text: 'hi'}, correlationKey: 'key', state: 'queued', attempts: 0},
      });
    });

    it('is found by its correlation key, through the handle and the outbox', async () => {
      await queued.handle.enqueue({payload: {text: 'hi'}, correlationKey: 'key'});

      expect(queued.operation('key')?.payload).toEqual({text: 'hi'});
      expect(kit.findOperation('key')?.kind).toBe(queued.kind.name);
    });

    it('needs no correlation key', async () => {
      const outcome = await queued.handle.enqueue({payload: {text: 'hi'}});

      expect(outcome.type).toBe('operation-queued');
    });

    it('does not find an operation of another kind through the handle', async () => {
      await queued.handle.enqueue({payload: {text: 'hi'}, correlationKey: 'key'});

      expect(other.operation('key')).toBeUndefined();
    });

    it('stores its first snapshot with the trigger enqueued, before answering', async () => {
      const outcome = await queued.handle.enqueue({payload: {text: 'hi'}, correlationKey: 'key', orderingKey: 'lane'});

      expect(kit.store.history(operationIdOf(outcome))).toEqual([
        expect.objectContaining({
          schemaVersion: 1,
          seq: 1,
          trigger: 'operation-queued',
          state: 'queued',
          kind: queued.kind.name,
          correlationKey: 'key',
          orderingKey: 'lane',
          attempts: 0,
          queuedAt: kit.clock.getServerTime(),
          at: kit.clock.getServerTime(),
        }),
      ]);
    });

    it('parses the payload and keeps what the kind returns', async () => {
      const outcome = await parsing.handle.enqueue({payload: {text: 'hi'}});

      expect(outcome).toMatchObject({operation: {payload: {text: 'hi!'}}});
    });

    it('calls onChanged with the queued operation', async () => {
      await queued.handle.enqueue({payload: {text: 'hi'}});

      expect(
        queued.changes.map(({state}) => {
          return state;
        }),
      ).toEqual(['queued']);
    });
  });

  describe('refusals', () => {
    it('refuses an empty correlation key', async () => {
      expect(await queued.handle.enqueue({payload: {text: 'hi'}, correlationKey: ''})).toEqual({
        type: 'correlation-key-empty',
      });
    });

    it('refuses an empty ordering key', async () => {
      expect(await queued.handle.enqueue({payload: {text: 'hi'}, orderingKey: ''})).toEqual({
        type: 'ordering-key-empty',
      });
    });

    it('refuses a payload the kind cannot parse, naming the error', async () => {
      const outcome = await queued.handle.enqueue({payload: {nothing: true} as never});

      expect(outcome).toEqual({type: 'payload-invalid', errorName: 'TypeError'});
      expect(kit.store.operationIds()).toEqual([]);
    });

    it('refuses a key that belongs to an operation of another kind', async () => {
      await other.handle.enqueue({payload: {text: 'hi'}, correlationKey: 'key'});

      expect(await queued.handle.enqueue({payload: {text: 'hi'}, correlationKey: 'key'})).toEqual({
        type: 'key-taken-by-other-kind',
        kind: other.kind.name,
      });
    });

    it('refuses a key of another kind even while that operation has an attempt running', async () => {
      kit.outbox.resume();
      await other.handle.enqueue({payload: {text: 'hi'}, correlationKey: 'key'});
      await kit.clock.settle();

      expect(await queued.handle.enqueue({payload: {text: 'hi'}, correlationKey: 'key'})).toEqual({
        type: 'key-taken-by-other-kind',
        kind: other.kind.name,
      });
    });

    it('refuses a new operation once maxOperations is reached', async () => {
      const limited = createOutboxTestKit({maxOperations: 2});
      const limitedKind = limited.registerKind();
      await limited.start({run: false});
      await limitedKind.handle.enqueue({payload: {text: '1'}});
      await limitedKind.handle.enqueue({payload: {text: '2'}});

      expect(await limitedKind.handle.enqueue({payload: {text: '3'}})).toEqual({type: 'outbox-full'});
      limited.dispose();
    });

    it('still takes a version of an operation when maxOperations is reached', async () => {
      const limited = createOutboxTestKit({maxOperations: 1});
      const limitedKind = limited.registerKind();
      await limited.start({run: false});
      await limitedKind.handle.enqueue({payload: {text: '1'}, correlationKey: 'key'});

      const outcome = await limitedKind.handle.enqueue({payload: {text: '2'}, correlationKey: 'key'});

      expect(outcome.type).toBe('operation-versioned');
      limited.dispose();
    });

    it('answers storage-failed and stores nothing when the store fails', async () => {
      kit.store.fail('append', true);

      const outcome = await queued.handle.enqueue({payload: {text: 'hi'}, correlationKey: 'key'});

      expect(outcome).toEqual({type: 'storage-failed', errorName: 'TestFailure'});
      expect(queued.operation('key')).toBeUndefined();
      expect(queued.changes).toEqual([]);
    });

    it('answers storage-full when the quota is reached', async () => {
      kit.store.fill(true);

      expect(await queued.handle.enqueue({payload: {text: 'hi'}, correlationKey: 'key'})).toEqual({
        type: 'storage-full',
      });
      expect(queued.operation('key')).toBeUndefined();
    });

    it('answers storage-failed when the store rejects', async () => {
      kit.store.rejectWith('append', new DOMException('quota', 'AbortError'));

      expect(await queued.handle.enqueue({payload: {text: 'hi'}})).toEqual({
        type: 'storage-failed',
        errorName: 'AbortError',
      });
    });
  });

  describe('a version', () => {
    async function enqueueFirst(
      request: Parameters<typeof queued.handle.enqueue>[0] = {payload: {text: 'v1'}},
    ): Promise<EnqueueOutcome<unknown>> {
      return queued.handle.enqueue({correlationKey: 'key', orderingKey: 'lane', ...request});
    }

    it('replaces the payload of the operation with the same key', async () => {
      const first = await enqueueFirst();

      const second = await queued.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key'});

      expect(second).toMatchObject({type: 'operation-versioned', operation: {payload: {text: 'v2'}}});
      expect(operationIdOf(second)).toBe(operationIdOf(first));
      expect(kit.store.operationIds()).toHaveLength(1);
    });

    it('appends a snapshot, and keeps the earlier payloads in the history', async () => {
      const first = await enqueueFirst();

      await queued.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key'});

      expect(
        kit.store.history(operationIdOf(first)).map(({seq, trigger, payload}) => {
          return [seq, trigger, payload];
        }),
      ).toEqual([
        [1, 'operation-queued', {text: 'v1'}],
        [2, 'operation-versioned', {text: 'v2'}],
      ]);
    });

    it('calls onChanged for each version', async () => {
      await enqueueFirst();
      await queued.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key'});

      expect(
        queued.changes.map(({payload}) => {
          return payload.text;
        }),
      ).toEqual(['v1', 'v2']);
    });

    it('keeps the queue time, the expiry and the timeout the request does not pass', async () => {
      const first = await enqueueFirst({
        payload: {text: 'v1'},
        expiresAfterMilliseconds: 5_000,
        performTimeoutMilliseconds: 700,
      });
      await kit.clock.advance(1_000);

      await queued.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key'});

      const newest = kit.store.history(operationIdOf(first)).at(-1);
      expect(newest).toMatchObject({
        queuedAt: 1_000_000,
        validUntil: 1_005_000,
        expiresAfterMilliseconds: 5_000,
        performTimeoutMilliseconds: 700,
        orderingKey: 'lane',
      });
    });

    it('starts the expiry again from now when the request passes it, even with the same value', async () => {
      const first = await enqueueFirst({payload: {text: 'v1'}, expiresAfterMilliseconds: 5_000});
      await kit.clock.advance(1_000);

      await queued.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key', expiresAfterMilliseconds: 5_000});

      expect(kit.store.history(operationIdOf(first)).at(-1)).toMatchObject({validUntil: 1_006_000});
    });

    it('takes the timeout the request passes', async () => {
      const first = await enqueueFirst({payload: {text: 'v1'}, performTimeoutMilliseconds: 700});

      await queued.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key', performTimeoutMilliseconds: 900});

      expect(kit.store.history(operationIdOf(first)).at(-1)?.performTimeoutMilliseconds).toBe(900);
    });

    it('moves to the end of the new lane when the request passes another ordering key', async () => {
      await queued.handle.enqueue({payload: {text: 'other'}, correlationKey: 'other', orderingKey: 'elsewhere'});
      await enqueueFirst();

      await queued.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key', orderingKey: 'elsewhere'});

      expect(kit.laneOf('lane')).toBeUndefined();
      expect(kit.laneOf('elsewhere')).toMatchObject({size: 1, first: {correlationKey: 'other'}});
    });

    it('keeps its place in the lane when the ordering key is the same or not passed', async () => {
      await enqueueFirst();
      await queued.handle.enqueue({payload: {text: 'later'}, correlationKey: 'later', orderingKey: 'lane'});

      await queued.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key', orderingKey: 'lane'});
      await queued.handle.enqueue({payload: {text: 'v3'}, correlationKey: 'key'});

      expect(kit.laneOf('lane')?.first.correlationKey).toBe('key');
    });

    it('starts the attempts again from 0', async () => {
      kit.outbox.resume();
      await enqueueFirst();
      await kit.clock.settle();
      await queued.lastPerform().answer({type: 'attempt-failed'});
      expect(queued.operation('key')).toMatchObject({state: 'queued', attempts: 1});

      const outcome = await queued.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key'});

      expect(outcome).toMatchObject({operation: {attempts: 0}});
    });

    it('releases a hold', async () => {
      await enqueueFirst();
      await kit.outbox.hold('key');

      await queued.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key'});

      expect(queued.operation('key')?.state).toBe('queued');
    });

    it('answers storage-failed and keeps the version it had when the store fails', async () => {
      await enqueueFirst();
      kit.store.fail('append', true);

      const outcome = await queued.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key'});

      expect(outcome.type).toBe('storage-failed');
      expect(queued.operation('key')?.payload).toEqual({text: 'v1'});
    });
  });

  describe('a dead-lettered operation', () => {
    async function deadLetter(): Promise<string> {
      const dead = await queued.handle.enqueue({
        payload: {text: 'v1'},
        correlationKey: 'key',
        expiresAfterMilliseconds: 1_000,
      });
      await kit.clock.advance(1_000);
      expect(queued.operation('key')?.state).toBe('dead-lettered');
      return operationIdOf(dead);
    }

    it('is sent again when enqueued again, as a version', async () => {
      await deadLetter();

      const outcome = await queued.handle.enqueue({payload: {text: 'v1'}, correlationKey: 'key'});

      expect(outcome).toMatchObject({type: 'operation-versioned', operation: {state: 'queued', attempts: 0}});
    });

    it('gets a new expiry from the request', async () => {
      const id = await deadLetter();

      await queued.handle.enqueue({payload: {text: 'v1'}, correlationKey: 'key', expiresAfterMilliseconds: 3_000});

      expect(kit.store.history(id).at(-1)).toMatchObject({validUntil: 1_004_000, expiresAfterMilliseconds: 3_000});
    });

    it('gets a new expiry from the kind when the request passes none', async () => {
      const dead = await expiring.handle.enqueue({payload: {text: 'v1'}, correlationKey: 'expiring'});
      await kit.clock.advance(10_000);
      expect(expiring.operation('expiring')?.state).toBe('dead-lettered');

      await expiring.handle.enqueue({payload: {text: 'v1'}, correlationKey: 'expiring'});

      expect(kit.store.history(operationIdOf(dead)).at(-1)).toMatchObject({
        validUntil: kit.clock.getServerTime() + 10_000,
      });
    });

    it('is not revived by anything else', async () => {
      await deadLetter();

      expect((await kit.outbox.hold('key')).type).toBe('operation-not-queued');
      expect((await kit.outbox.release('key')).type).toBe('operation-not-on-hold');
      kit.outbox.resume();
      await kit.clock.advance(120_000);

      expect(queued.operation('key')?.state).toBe('dead-lettered');
      expect(queued.performs).toHaveLength(0);
    });
  });

  describe('expiry and limits of the kind', () => {
    it('takes the expiry of the kind, and the request overrides it for that operation only', async () => {
      const byKind = await expiring.handle.enqueue({payload: {text: 'a'}});
      const byRequest = await expiring.handle.enqueue({payload: {text: 'b'}, expiresAfterMilliseconds: 500});

      expect(kit.store.history(operationIdOf(byKind)).at(-1)).toMatchObject({validUntil: 1_010_000});
      expect(kit.store.history(operationIdOf(byRequest)).at(-1)).toMatchObject({
        validUntil: 1_000_500,
        expiresAfterMilliseconds: 500,
      });
    });

    it('has no expiry when neither the kind nor the request sets one', async () => {
      const outcome = await queued.handle.enqueue({payload: {text: 'a'}});

      expect(kit.store.history(operationIdOf(outcome)).at(-1)?.validUntil).toBeUndefined();
    });
  });
});

function parseText(value: unknown): string {
  return (value as {text: string}).text;
}
