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

import {createOutboxTestKit, parseTestPayload, type OutboxTestKit, type TestKind} from './testing/createOutboxTestKit';

import {SCHEMA_VERSION} from './operationRules';
import type {OperationSnapshot} from './types';

describe('createOutbox enqueue', () => {
  let kit: OutboxTestKit;
  let testKind: TestKind;
  let otherKind: TestKind;

  beforeEach(async () => {
    kit = createOutboxTestKit();
    testKind = kit.registerKind();
    otherKind = kit.registerKind();
    await kit.start({run: false});
  });

  afterEach(async () => {
    await kit.outbox.stop();
  });

  function historyOf(operationId: string): Pick<OperationSnapshot, 'seq' | 'trigger' | 'state' | 'payload'>[] {
    return kit.store.history(operationId).map(({seq, trigger, state, payload}) => {
      return {seq, trigger, state, payload};
    });
  }

  describe('a new operation', () => {
    it('is queued, answered as it was left', async () => {
      expect(await testKind.handle.enqueue({payload: {text: 'hi'}, correlationKey: 'key'})).toMatchObject({
        outcome: 'operation-queued',
        operation: {
          id: 'operation-1',
          state: 'queued',
          kind: testKind.kind.name,
          payload: {text: 'hi'},
          correlation: {state: 'correlated', correlationKey: 'key'},
          lane: {state: 'no-lane'},
          queuedAt: 1_000_000,
          attempts: 0,
        },
      });
    });

    it('is answered and announced as the view only, without what only the kernel reads', async () => {
      const view = {
        id: 'operation-1',
        state: 'queued',
        kind: testKind.kind.name,
        payload: {text: 'hi'},
        correlation: {state: 'correlated', correlationKey: 'key'},
        lane: {state: 'no-lane'},
        queuedAt: 1_000_000,
        attempts: 0,
      };

      expect(await testKind.handle.enqueue({payload: {text: 'hi'}, correlationKey: 'key'})).toEqual({
        outcome: 'operation-queued',
        operation: view,
      });
      expect(testKind.changes).toEqual([view]);
      expect(kit.outbox.findByCorrelationKey('key')).toEqual({outcome: 'operation-found', operation: view});
    });

    it('is handed to its attempt and listed in its lane as the view only', async () => {
      await testKind.handle.enqueue({payload: {text: 'hi'}, correlationKey: 'key', laneKey: 'lane'});
      const view = {
        id: 'operation-1',
        kind: testKind.kind.name,
        payload: {text: 'hi'},
        correlation: {state: 'correlated', correlationKey: 'key'},
        lane: {state: 'in-lane', laneKey: 'lane'},
        queuedAt: 1_000_000,
      };

      expect(kit.outbox.lanes()).toEqual({
        outcome: 'lanes-listed',
        lanes: [{state: 'moving', laneKey: 'lane', operations: [{...view, state: 'queued', attempts: 0}]}],
      });
      kit.outbox.resume();
      await kit.clock.settle();
      expect(testKind.lastAttempt().operation).toEqual({...view, state: 'in-progress', attempts: 1});
    });

    it('is found by its correlation key, through the handle and the outbox', async () => {
      await testKind.handle.enqueue({payload: {text: 'hi'}, correlationKey: 'key'});

      expect(testKind.operation('key')).toMatchObject({id: 'operation-1', payload: {text: 'hi'}});
      expect(kit.operation('key')).toMatchObject({id: 'operation-1', kind: testKind.kind.name});
    });

    it('needs no correlation key and is then uncorrelated', async () => {
      expect(await testKind.handle.enqueue({payload: {text: 'hi'}})).toMatchObject({
        outcome: 'operation-queued',
        operation: {correlation: {state: 'uncorrelated'}},
      });
    });

    it('needs no lane key and is then in no lane', async () => {
      await testKind.handle.enqueue({payload: {text: 'hi'}});

      expect(kit.outbox.lanes()).toEqual({outcome: 'lanes-listed', lanes: []});
    });

    it('is in the lane when the request has a lane key', async () => {
      expect(await testKind.handle.enqueue({payload: {text: 'hi'}, laneKey: 'lane'})).toMatchObject({
        outcome: 'operation-queued',
        operation: {lane: {state: 'in-lane', laneKey: 'lane'}},
      });
    });

    it('is not found through the handle of another kind', async () => {
      await testKind.handle.enqueue({payload: {text: 'hi'}, correlationKey: 'key'});

      expect(otherKind.handle.find('key')).toEqual({outcome: 'operation-not-found'});
    });

    it('parses the payload and keeps what the kind returns', async () => {
      const freshKit = createOutboxTestKit();
      const freshParsing = freshKit.registerKind({
        parsePayload: value => {
          return {text: `${parseTestPayload(value).text}!`};
        },
      });
      await freshKit.start({run: false});

      expect(await freshParsing.handle.enqueue({payload: {text: 'hi'}})).toMatchObject({
        operation: {payload: {text: 'hi!'}},
      });
      await freshKit.outbox.stop();
    });

    it('stores its first snapshot before answering', async () => {
      await testKind.handle.enqueue({payload: {text: 'hi'}, correlationKey: 'key', laneKey: 'lane'});

      expect(kit.store.history('operation-1')).toEqual([
        expect.objectContaining({
          schemaVersion: SCHEMA_VERSION,
          seq: 1,
          trigger: 'operation-queued',
          state: 'queued',
          kind: testKind.kind.name,
          correlation: {state: 'correlated', correlationKey: 'key'},
          lane: {state: 'in-lane', laneKey: 'lane'},
          attempts: 0,
          queuedAt: 1_000_000,
          at: 1_000_000,
          cascade: {state: 'none'},
        }),
      ]);
    });

    it('calls onChanged with the queued operation', async () => {
      await testKind.handle.enqueue({payload: {text: 'hi'}});

      expect(testKind.changes).toEqual([expect.objectContaining({id: 'operation-1', state: 'queued'})]);
    });

    it('takes the expiry and the attempt timeout of the kind', async () => {
      const limitedKit = createOutboxTestKit();
      const limited = limitedKit.registerKind({expiresAfterMilliseconds: 10_000, attemptTimeoutMilliseconds: 500});
      await limitedKit.start({run: false});

      await limited.handle.enqueue({payload: {text: 'hi'}});

      expect(limitedKit.store.history('operation-1').at(-1)).toMatchObject({
        expiry: {state: 'expires-at', serverTime: 1_010_000},
        limits: {attemptTimeout: {state: 'times-out-after', milliseconds: 500}},
      });
      await limitedKit.outbox.stop();
    });

    it('takes the limits of the request over those of the kind, for that operation only', async () => {
      const limitedKit = createOutboxTestKit();
      const limited = limitedKit.registerKind({expiresAfterMilliseconds: 10_000, attemptTimeoutMilliseconds: 500});
      await limitedKit.start({run: false});

      await limited.handle.enqueue({
        payload: {text: 'a'},
        expiresAfterMilliseconds: 2_000,
        attemptTimeoutMilliseconds: 700,
      });
      await limited.handle.enqueue({payload: {text: 'b'}});

      expect(limitedKit.store.history('operation-1').at(-1)).toMatchObject({
        expiry: {state: 'expires-at', serverTime: 1_002_000},
        limits: {attemptTimeout: {state: 'times-out-after', milliseconds: 700}},
      });
      expect(limitedKit.store.history('operation-2').at(-1)).toMatchObject({
        expiry: {state: 'expires-at', serverTime: 1_010_000},
        limits: {attemptTimeout: {state: 'times-out-after', milliseconds: 500}},
      });
      await limitedKit.outbox.stop();
    });

    it('never expires and never times out when neither the kind nor the request sets a limit', async () => {
      await testKind.handle.enqueue({payload: {text: 'hi'}});

      expect(kit.store.history('operation-1').at(-1)).toMatchObject({
        expiry: {state: 'never-expires'},
        limits: {attemptTimeout: {state: 'never-times-out'}},
      });
    });
  });

  describe('refusals', () => {
    it('refuses an empty correlation key', async () => {
      expect(await testKind.handle.enqueue({payload: {text: 'hi'}, correlationKey: ''})).toEqual({
        outcome: 'correlation-key-empty',
      });
    });

    it('refuses an empty lane key', async () => {
      expect(await testKind.handle.enqueue({payload: {text: 'hi'}, laneKey: ''})).toEqual({
        outcome: 'lane-key-empty',
      });
    });

    it('stores nothing when it refuses a key', async () => {
      await testKind.handle.enqueue({payload: {text: 'hi'}, correlationKey: ''});
      await testKind.handle.enqueue({payload: {text: 'hi'}, laneKey: ''});

      expect(
        kit.store.calls.filter(({method}) => {
          return method === 'append';
        }),
      ).toEqual([]);
    });

    it('refuses a payload the kind cannot parse, naming the error', async () => {
      expect(await testKind.handle.enqueue({payload: {nothing: true} as never})).toEqual({
        outcome: 'payload-invalid',
        errorName: 'TypeError',
      });
      expect(kit.store.operationIds()).toEqual([]);
      expect(testKind.changes).toEqual([]);
    });

    it('refuses a key that belongs to an operation of another kind', async () => {
      await otherKind.handle.enqueue({payload: {text: 'hi'}, correlationKey: 'key'});

      expect(await testKind.handle.enqueue({payload: {text: 'hi'}, correlationKey: 'key'})).toEqual({
        outcome: 'key-taken-by-other-kind',
        kind: otherKind.kind.name,
      });
    });

    it('refuses a key of another kind at once while that operation has an attempt running', async () => {
      kit.outbox.resume();
      await kit.enqueue(otherKind, {correlationKey: 'key'});
      expect(otherKind.lastAttempt().operation).toMatchObject({state: 'in-progress'});

      expect(await testKind.handle.enqueue({payload: {text: 'hi'}, correlationKey: 'key'})).toEqual({
        outcome: 'key-taken-by-other-kind',
        kind: otherKind.kind.name,
      });
    });

    it('refuses a new operation once maxOperations is reached', async () => {
      const limitedKit = createOutboxTestKit({maxOperations: 2});
      const limited = limitedKit.registerKind();
      await limitedKit.start({run: false});
      await limited.handle.enqueue({payload: {text: '1'}});
      await limited.handle.enqueue({payload: {text: '2'}});

      expect(await limited.handle.enqueue({payload: {text: '3'}})).toEqual({outcome: 'outbox-full'});
      expect(limitedKit.store.operationIds()).toEqual(['operation-1', 'operation-2']);
      await limitedKit.outbox.stop();
    });

    it('counts a dead-lettered operation towards maxOperations', async () => {
      const limitedKit = createOutboxTestKit({maxOperations: 1});
      const limited = limitedKit.registerKind({expiresAfterMilliseconds: 1_000});
      await limitedKit.start({run: false});
      await limited.handle.enqueue({payload: {text: '1'}});
      await limitedKit.clock.advance(1_000);
      expect(limitedKit.store.history('operation-1').at(-1)).toMatchObject({state: 'dead-lettered'});

      expect(await limited.handle.enqueue({payload: {text: '2'}})).toEqual({outcome: 'outbox-full'});
      await limitedKit.outbox.stop();
    });

    it('still takes a version of an operation when maxOperations is reached', async () => {
      const limitedKit = createOutboxTestKit({maxOperations: 1});
      const limited = limitedKit.registerKind();
      await limitedKit.start({run: false});
      await limited.handle.enqueue({payload: {text: '1'}, correlationKey: 'key'});

      expect(await limited.handle.enqueue({payload: {text: '2'}, correlationKey: 'key'})).toMatchObject({
        outcome: 'operation-versioned',
      });
      await limitedKit.outbox.stop();
    });

    it('is not taken before the outbox is started', async () => {
      const notStartedKit = createOutboxTestKit();
      const notStarted = notStartedKit.registerKind();

      expect(await notStarted.handle.enqueue({payload: {text: 'hi'}})).toEqual({outcome: 'outbox-not-started'});
    });

    it('answers storage-failed and keeps nothing when the store fails', async () => {
      kit.store.fail('append', true);

      expect(await testKind.handle.enqueue({payload: {text: 'hi'}, correlationKey: 'key'})).toEqual({
        outcome: 'storage-failed',
        errorName: 'TestFailure',
      });
      expect(kit.outbox.findByCorrelationKey('key')).toEqual({outcome: 'operation-not-found'});
      expect(testKind.changes).toEqual([]);
    });

    it('answers storage-full and keeps nothing when the quota is reached', async () => {
      kit.store.fill(true);

      expect(await testKind.handle.enqueue({payload: {text: 'hi'}, correlationKey: 'key'})).toEqual({
        outcome: 'storage-full',
      });
      expect(kit.outbox.findByCorrelationKey('key')).toEqual({outcome: 'operation-not-found'});
    });

    it('answers storage-failed naming the error when the store rejects', async () => {
      kit.store.rejectWith('append', new DOMException('quota', 'AbortError'));

      expect(await testKind.handle.enqueue({payload: {text: 'hi'}})).toEqual({
        outcome: 'storage-failed',
        errorName: 'AbortError',
      });
    });
  });

  describe('a version', () => {
    it('replaces the payload of the operation with the same correlation key', async () => {
      await testKind.handle.enqueue({payload: {text: 'v1'}, correlationKey: 'key'});

      expect(await testKind.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key'})).toMatchObject({
        outcome: 'operation-versioned',
        operation: {id: 'operation-1', state: 'queued', payload: {text: 'v2'}},
      });
      expect(kit.store.operationIds()).toEqual(['operation-1']);
    });

    it('stores a snapshot and keeps the earlier payloads in the history', async () => {
      await testKind.handle.enqueue({payload: {text: 'v1'}, correlationKey: 'key'});

      await testKind.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key'});

      expect(historyOf('operation-1')).toEqual([
        {seq: 1, trigger: 'operation-queued', state: 'queued', payload: {text: 'v1'}},
        {seq: 2, trigger: 'operation-versioned', state: 'queued', payload: {text: 'v2'}},
      ]);
    });

    it('calls onChanged for each version', async () => {
      await testKind.handle.enqueue({payload: {text: 'v1'}, correlationKey: 'key'});
      await testKind.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key'});

      expect(
        testKind.changes.map(({payload}) => {
          return payload.text;
        }),
      ).toEqual(['v1', 'v2']);
    });

    it('is a version of an operation of the same kind that was enqueued without a lane', async () => {
      await testKind.handle.enqueue({payload: {text: 'v1'}, correlationKey: 'key'});

      await testKind.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key'});

      expect(kit.operation('key')).toMatchObject({lane: {state: 'no-lane'}});
    });

    it('keeps the queue time, the expiry, the timeout and the lane the request does not pass', async () => {
      await testKind.handle.enqueue({
        payload: {text: 'v1'},
        correlationKey: 'key',
        laneKey: 'lane',
        expiresAfterMilliseconds: 5_000,
        attemptTimeoutMilliseconds: 700,
      });
      await kit.clock.advance(1_000);

      await testKind.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key'});

      expect(kit.store.history('operation-1').at(-1)).toMatchObject({
        queuedAt: 1_000_000,
        expiry: {state: 'expires-at', serverTime: 1_005_000},
        limits: {attemptTimeout: {state: 'times-out-after', milliseconds: 700}},
        lane: {state: 'in-lane', laneKey: 'lane'},
      });
    });

    it('starts the expiry again from now when the request passes one, even the same', async () => {
      await testKind.handle.enqueue({payload: {text: 'v1'}, correlationKey: 'key', expiresAfterMilliseconds: 5_000});
      await kit.clock.advance(1_000);

      await testKind.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key', expiresAfterMilliseconds: 5_000});

      expect(kit.store.history('operation-1').at(-1)).toMatchObject({
        expiry: {state: 'expires-at', serverTime: 1_006_000},
      });
    });

    it('takes the attempt timeout the request passes', async () => {
      await testKind.handle.enqueue({payload: {text: 'v1'}, correlationKey: 'key', attemptTimeoutMilliseconds: 700});

      await testKind.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key', attemptTimeoutMilliseconds: 900});

      expect(kit.store.history('operation-1').at(-1)).toMatchObject({
        limits: {attemptTimeout: {state: 'times-out-after', milliseconds: 900}},
      });
    });

    it('moves to the end of the new lane when the request passes another lane key', async () => {
      await testKind.handle.enqueue({payload: {text: 'other'}, correlationKey: 'other', laneKey: 'elsewhere'});
      await testKind.handle.enqueue({payload: {text: 'v1'}, correlationKey: 'key', laneKey: 'lane'});

      await testKind.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key', laneKey: 'elsewhere'});

      expect(kit.outbox.lane('lane')).toEqual({outcome: 'lane-empty'});
      expect(
        kit.lane('elsewhere').operations.map(({id}) => {
          return id;
        }),
      ).toEqual(['operation-1', 'operation-2']);
    });

    it('keeps its place in the lane when the lane key is the same or not passed', async () => {
      await testKind.handle.enqueue({payload: {text: 'v1'}, correlationKey: 'key', laneKey: 'lane'});
      await testKind.handle.enqueue({payload: {text: 'later'}, correlationKey: 'later', laneKey: 'lane'});

      await testKind.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key', laneKey: 'lane'});
      await testKind.handle.enqueue({payload: {text: 'v3'}, correlationKey: 'key'});

      expect(
        kit.lane('lane').operations.map(({id}) => {
          return id;
        }),
      ).toEqual(['operation-1', 'operation-2']);
    });

    it('starts the attempts again from 0', async () => {
      kit.outbox.resume();
      await kit.enqueue(testKind, {correlationKey: 'key'});
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});
      expect(testKind.operation('key')).toMatchObject({state: 'queued', attempts: 1});

      expect(await testKind.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key'})).toMatchObject({
        operation: {attempts: 0},
      });
    });

    it('queues an operation that is on hold, so releasing it', async () => {
      await testKind.handle.enqueue({payload: {text: 'v1'}, correlationKey: 'key'});
      await kit.outbox.hold('key');

      expect(await testKind.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key'})).toMatchObject({
        outcome: 'operation-versioned',
        operation: {state: 'queued'},
      });
    });

    it('answers storage-failed and keeps the version it had when the store fails', async () => {
      await testKind.handle.enqueue({payload: {text: 'v1'}, correlationKey: 'key'});
      kit.store.fail('append', true);

      expect(await testKind.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key'})).toEqual({
        outcome: 'storage-failed',
        errorName: 'TestFailure',
      });
      expect(testKind.operation('key').payload).toEqual({text: 'v1'});
    });

    it('answers storage-full and keeps the version it had when the quota is reached', async () => {
      await testKind.handle.enqueue({payload: {text: 'v1'}, correlationKey: 'key'});
      kit.store.fill(true);

      expect(await testKind.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key'})).toEqual({
        outcome: 'storage-full',
      });
      expect(testKind.operation('key').payload).toEqual({text: 'v1'});
    });

    it('refuses an invalid payload without changing the operation', async () => {
      await testKind.handle.enqueue({payload: {text: 'v1'}, correlationKey: 'key'});

      expect(await testKind.handle.enqueue({payload: {nothing: true} as never, correlationKey: 'key'})).toEqual({
        outcome: 'payload-invalid',
        errorName: 'TypeError',
      });
      expect(historyOf('operation-1')).toHaveLength(1);
    });
  });

  describe('a dead-lettered operation', () => {
    let expiringKind: TestKind;
    let expiringKit: OutboxTestKit;

    beforeEach(async () => {
      expiringKit = createOutboxTestKit();
      expiringKind = expiringKit.registerKind({expiresAfterMilliseconds: 10_000});
      await expiringKit.start({run: false});
    });

    afterEach(async () => {
      await expiringKit.outbox.stop();
    });

    async function deadLetter(request: {expiresAfterMilliseconds?: number} = {}): Promise<void> {
      await expiringKind.handle.enqueue({payload: {text: 'v1'}, correlationKey: 'key', ...request});
      await expiringKit.clock.advance(request.expiresAfterMilliseconds ?? 10_000);
      expect(expiringKind.operation('key').state).toBe('dead-lettered');
    }

    it('is queued again when enqueued again, as a version', async () => {
      await deadLetter();

      expect(await expiringKind.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key'})).toMatchObject({
        outcome: 'operation-versioned',
        operation: {id: 'operation-1', state: 'queued', attempts: 0, payload: {text: 'v2'}},
      });
    });

    it('gets the expiry of the request', async () => {
      await deadLetter();

      await expiringKind.handle.enqueue({
        payload: {text: 'v2'},
        correlationKey: 'key',
        expiresAfterMilliseconds: 3_000,
      });

      expect(expiringKit.store.history('operation-1').at(-1)).toMatchObject({
        expiry: {state: 'expires-at', serverTime: 1_013_000},
      });
    });

    it('gets the expiry of the kind when the request passes none, not the earlier enqueue', async () => {
      await deadLetter({expiresAfterMilliseconds: 1_000});

      await expiringKind.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key'});

      expect(expiringKit.store.history('operation-1').at(-1)).toMatchObject({
        expiry: {state: 'expires-at', serverTime: 1_011_000},
      });
    });

    it('is sent again once it is queued again', async () => {
      await deadLetter();
      expiringKit.outbox.resume();

      await expiringKind.handle.enqueue({payload: {text: 'v2'}, correlationKey: 'key'});
      await expiringKit.clock.settle();

      expect(expiringKind.lastAttempt().operation).toMatchObject({id: 'operation-1', attempts: 1});
    });

    it('is not revived by a hold, a release, the resume or the passing of time', async () => {
      await deadLetter();

      expect(await expiringKit.outbox.hold('key')).toMatchObject({outcome: 'transition-refused'});
      expect(await expiringKit.outbox.release('key')).toMatchObject({outcome: 'transition-refused'});
      expiringKit.outbox.resume();
      await expiringKit.clock.advance(120_000);

      expect(expiringKind.operation('key').state).toBe('dead-lettered');
      expect(expiringKind.attempts).toEqual([]);
    });
  });
});
