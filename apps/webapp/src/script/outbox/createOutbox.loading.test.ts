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

import {correlated, createOutboxTestKit, createStoredSnapshot, type OutboxTestKit} from './testing/createOutboxTestKit';

describe('createOutbox loading', () => {
  let kit: OutboxTestKit;

  beforeEach(() => {
    kit = createOutboxTestKit();
  });

  describe('usable operations', () => {
    it('parses the stored payload with the kind', async () => {
      const testKind = kit.registerKind({
        parsePayload: value => {
          return {text: `parsed ${JSON.stringify(value)}`};
        },
      });
      kit.store.seed(
        createStoredSnapshot({kind: testKind.kind.name, correlation: correlated('stored'), payload: {text: 'raw'}}),
      );

      await kit.start({run: false});

      expect(kit.operation('stored')).toMatchObject({payload: {text: 'parsed {"text":"raw"}'}});
    });

    it('loads the stored operations into the lanes they were in', async () => {
      const testKind = kit.registerKind();
      kit.store.seed(
        createStoredSnapshot({
          kind: testKind.kind.name,
          correlation: correlated('stored'),
          lane: {state: 'in-lane', laneKey: 'lane'},
        }),
      );

      await kit.start({run: false});

      expect(kit.lane('lane')).toMatchObject({state: 'moving', operations: [{id: 'stored-operation'}]});
      expect(testKind.handle.find('stored')).toMatchObject({outcome: 'operation-found'});
    });

    it('keeps an on-hold operation on hold', async () => {
      const testKind = kit.registerKind();
      kit.store.seed(
        createStoredSnapshot({kind: testKind.kind.name, correlation: correlated('stored'), state: 'on-hold'}),
      );

      await kit.start();

      expect(kit.operation('stored').state).toBe('on-hold');
      expect(testKind.attempts).toHaveLength(0);
    });

    it('keeps a dead-lettered operation dead-lettered', async () => {
      const testKind = kit.registerKind();
      kit.store.seed(
        createStoredSnapshot({kind: testKind.kind.name, correlation: correlated('stored'), state: 'dead-lettered'}),
      );

      await kit.start();

      expect(kit.operation('stored').state).toBe('dead-lettered');
      expect(testKind.attempts).toHaveLength(0);
    });

    it('keeps the lane order of the stored operations for what is enqueued afterwards', async () => {
      const testKind = kit.registerKind();
      kit.store.seed(
        createStoredSnapshot({
          kind: testKind.kind.name,
          correlation: correlated('stored'),
          lane: {state: 'in-lane', laneKey: 'lane'},
          queuedSeq: 7,
        }),
      );
      await kit.start({run: false});

      await kit.enqueue(testKind, {correlationKey: 'new', laneKey: 'lane'});

      expect(
        kit.lane('lane').operations.map(({id}) => {
          return id;
        }),
      ).toEqual(['stored-operation', 'operation-1']);
      expect(kit.store.history('operation-1').at(-1)).toMatchObject({queuedSeq: 8});
    });

    it('runs the loaded queued operations once resumed', async () => {
      const testKind = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: testKind.kind.name}));

      await kit.start();

      expect(testKind.lastAttempt().operation).toMatchObject({id: 'stored-operation', attempts: 1});
    });
  });

  describe('interrupted attempts', () => {
    it('loads an operation whose attempt was running as queued, by attempt-interrupted', async () => {
      const testKind = kit.registerKind();
      kit.store.seed(
        createStoredSnapshot({
          kind: testKind.kind.name,
          id: 'running',
          correlation: correlated('running'),
          state: 'in-progress',
          attempts: 1,
        }),
      );

      await kit.start({run: false});

      expect(kit.operation('running').state).toBe('queued');
      expect(kit.store.history('running').at(-1)).toMatchObject({
        trigger: 'attempt-interrupted',
        state: 'queued',
        seq: 2,
      });
    });

    it('retries the interrupted attempt as the next attempt', async () => {
      const testKind = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: testKind.kind.name, state: 'in-progress', attempts: 1}));

      await kit.start();

      expect(testKind.lastAttempt().operation).toMatchObject({attempts: 2});
    });

    it('dead-letters an interrupted attempt that was the last one', async () => {
      const testKind = kit.registerKind({maxAttempts: 1});
      kit.store.seed(
        createStoredSnapshot({
          kind: testKind.kind.name,
          id: 'a',
          correlation: correlated('a'),
          state: 'in-progress',
          attempts: 1,
        }),
      );

      await kit.start();

      expect(kit.operation('a').state).toBe('dead-lettered');
      expect(kit.store.history('a').at(-1)).toMatchObject({trigger: 'attempt-interrupted', state: 'dead-lettered'});
      expect(testKind.attempts).toHaveLength(0);
    });

    it('deletes an interrupted attempt that was the last one, when the kind deletes what is exhausted', async () => {
      const testKind = kit.registerKind({maxAttempts: 1, whenExhausted: 'delete'});
      kit.store.seed(
        createStoredSnapshot({
          kind: testKind.kind.name,
          id: 'b',
          correlation: correlated('b'),
          state: 'in-progress',
          attempts: 1,
        }),
      );

      await kit.start();

      expect(kit.outbox.findByCorrelationKey('b')).toEqual({outcome: 'operation-not-found'});
      expect(kit.store.operationIds()).toEqual([]);
    });

    it('tells the kind once, with the deleted operation, about an operation exhausted at load', async () => {
      const testKind = kit.registerKind({maxAttempts: 1, whenExhausted: 'delete'});
      kit.store.seed(createStoredSnapshot({kind: testKind.kind.name, state: 'in-progress', attempts: 1}));

      await kit.start({run: false});

      expect(testKind.changes).toEqual([expect.objectContaining({id: 'stored-operation', state: 'deleted'})]);
    });
  });

  describe('unusable operations', () => {
    it('deletes an operation whose newest snapshot has another schema version', async () => {
      const {kind} = kit.registerKind();
      kit.store.seed(
        createStoredSnapshot({kind: kind.name, id: 'old', correlation: correlated('old'), schemaVersion: 0}),
      );

      await kit.start({run: false});

      expect(kit.outbox.findByCorrelationKey('old')).toEqual({outcome: 'operation-not-found'});
      expect(kit.store.operationIds()).toEqual([]);
    });

    it('deletes an operation whose kind is not registered', async () => {
      kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: 'gone', id: 'orphan', correlation: correlated('orphan')}));

      await kit.start({run: false});

      expect(kit.outbox.findByCorrelationKey('orphan')).toEqual({outcome: 'operation-not-found'});
      expect(kit.store.operationIds()).toEqual([]);
    });

    it('deletes an operation whose payload no longer parses', async () => {
      const {kind} = kit.registerKind();
      kit.store.seed(
        createStoredSnapshot({kind: kind.name, id: 'bad', correlation: correlated('bad'), payload: {unexpected: 1}}),
      );

      await kit.start({run: false});

      expect(kit.outbox.findByCorrelationKey('bad')).toEqual({outcome: 'operation-not-found'});
      expect(kit.store.operationIds()).toEqual([]);
    });

    it.each(['succeeded', 'deleted'] as const)(
      'deletes an operation whose newest snapshot is %s, left by an interrupted delete',
      async state => {
        const {kind} = kit.registerKind();
        kit.store.seed(createStoredSnapshot({kind: kind.name, id: 'done', correlation: correlated('done'), state}));

        await kit.start({run: false});

        expect(kit.outbox.findByCorrelationKey('done')).toEqual({outcome: 'operation-not-found'});
        expect(kit.store.operationIds()).toEqual([]);
      },
    );

    it('deletes the unusable operations in one call, and keeps the usable ones', async () => {
      const {kind} = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: kind.name, id: 'usable', correlation: correlated('usable')}));
      kit.store.seed(createStoredSnapshot({kind: 'gone', id: 'orphan-1'}));
      kit.store.seed(createStoredSnapshot({kind: kind.name, id: 'old', schemaVersion: 0}));

      await kit.start({run: false});

      expect(
        kit.store.calls.filter(({method}) => {
          return method === 'remove';
        }),
      ).toEqual([{method: 'remove', operationIds: ['orphan-1', 'old']}]);
      expect(kit.store.operationIds()).toEqual(['usable']);
    });

    it('does not call the kind about an operation it deleted', async () => {
      const testKind = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: testKind.kind.name, payload: {unexpected: 1}}));

      await kit.start({run: false});

      expect(testKind.changes).toEqual([]);
    });

    it('does not delete when nothing is unusable', async () => {
      const {kind} = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: kind.name}));

      await kit.start({run: false});

      expect(
        kit.store.calls.filter(({method}) => {
          return method === 'remove';
        }),
      ).toEqual([]);
    });
  });

  describe('quarantine', () => {
    it('logs the count the store quarantined together with the operations it deleted itself', async () => {
      const {kind} = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: kind.name, id: 'usable'}));
      kit.store.seed(createStoredSnapshot({kind: 'gone', id: 'orphan'}));
      kit.store.quarantine(2);

      await kit.start({run: false});

      expect(kit.logger.entriesOf('Operations loaded')).toEqual([
        {level: 'info', message: 'Operations loaded', attributes: {count: 1, quarantinedCount: 3}},
      ]);
    });

    it('logs no quarantined operation when every stored one is usable', async () => {
      const {kind} = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: kind.name}));

      await kit.start({run: false});

      expect(kit.logger.entriesOf('Operations loaded')).toEqual([
        {level: 'info', message: 'Operations loaded', attributes: {count: 1, quarantinedCount: 0}},
      ]);
    });
  });

  describe('onChanged', () => {
    it('is called once for each loaded operation', async () => {
      const testKind = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: testKind.kind.name, id: 'a'}));
      kit.store.seed(createStoredSnapshot({kind: testKind.kind.name, id: 'b', state: 'in-progress', attempts: 1}));
      kit.store.seed(createStoredSnapshot({kind: testKind.kind.name, id: 'c', state: 'on-hold'}));

      await kit.start({run: false});

      expect(
        testKind.changes
          .map(({id, state}) => {
            return [id, state];
          })
          .sort(),
      ).toEqual([
        ['a', 'queued'],
        ['b', 'queued'],
        ['c', 'on-hold'],
      ]);
    });

    it('is called for each kind about its own operations only', async () => {
      const first = kit.registerKind();
      const second = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: first.kind.name, id: 'a'}));
      kit.store.seed(createStoredSnapshot({kind: second.kind.name, id: 'b'}));

      await kit.start({run: false});

      expect(
        first.changes.map(({id}) => {
          return id;
        }),
      ).toEqual(['a']);
      expect(
        second.changes.map(({id}) => {
          return id;
        }),
      ).toEqual(['b']);
    });

    it('is called with the parsed payload', async () => {
      const testKind = kit.registerKind({
        parsePayload: () => {
          return {text: 'parsed'};
        },
      });
      kit.store.seed(createStoredSnapshot({kind: testKind.kind.name}));

      await kit.start({run: false});

      expect(testKind.changes).toEqual([expect.objectContaining({payload: {text: 'parsed'}})]);
    });
  });
});
