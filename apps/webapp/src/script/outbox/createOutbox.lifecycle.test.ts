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

import {createOutboxTestKit, createStoredSnapshot, type OutboxTestKit} from './testing/createOutboxTestKit';

describe('createOutbox lifecycle', () => {
  let kit: OutboxTestKit;

  beforeEach(() => {
    kit = createOutboxTestKit();
  });

  afterEach(() => {
    kit.dispose();
  });

  describe('register', () => {
    it('registers a kind and hands out its handle', () => {
      const registered = kit.outbox.register({...kit.registerKind().kind, name: 'another'});

      expect(registered.type).toBe('kind-registered');
    });

    it('refuses a name that is taken', () => {
      const {kind} = kit.registerKind();

      expect(kit.outbox.register(kind)).toEqual({type: 'kind-name-taken', kind: kind.name});
    });

    it('refuses a kind once the outbox has started', async () => {
      const {kind} = kit.registerKind();
      await kit.start();

      expect(kit.outbox.register({...kind, name: 'late'})).toEqual({type: 'outbox-already-started'});
    });
  });

  describe('start', () => {
    it('starts and reports itself started', async () => {
      kit.registerKind();

      const outcome = await kit.outbox.start();

      expect(outcome).toEqual({type: 'outbox-started'});
      expect(kit.outbox.isStarted()).toBe(true);
    });

    it('refuses a second start', async () => {
      await kit.start();

      expect(await kit.outbox.start()).toEqual({type: 'outbox-already-started'});
    });

    it('refuses a start while another is loading', async () => {
      const firstStart = kit.outbox.start();

      expect(await kit.outbox.start()).toEqual({type: 'outbox-already-started'});
      await firstStart;
    });

    it('stays unstarted when the store fails, and may be started again', async () => {
      kit.store.fail('loadLatest', true);

      const failed = await kit.outbox.start();

      expect(failed).toEqual({type: 'storage-failed', errorName: 'TestFailure'});
      expect(kit.outbox.isStarted()).toBe(false);

      kit.store.fail('loadLatest', false);
      expect(await kit.outbox.start()).toEqual({type: 'outbox-started'});
    });

    it('answers storage-failed when the store rejects', async () => {
      kit.store.rejectWith('loadLatest', new RangeError('broken'));

      expect(await kit.outbox.start()).toEqual({type: 'storage-failed', errorName: 'RangeError'});
    });

    it('answers storage-full when storing the interrupted attempt hits the quota', async () => {
      const {kind} = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: kind.name, state: 'in-progress', attempts: 1}));
      kit.store.fill(true);

      expect(await kit.outbox.start()).toEqual({type: 'storage-full'});
      expect(kit.outbox.isStarted()).toBe(false);
    });

    it('answers every call and every read before the start with outbox-not-started', async () => {
      const {handle} = kit.registerKind();

      expect(await handle.enqueue({payload: {text: 'early'}, correlationKey: 'key'})).toEqual({
        type: 'outbox-not-started',
      });
      expect(await kit.outbox.hold('key')).toEqual({type: 'outbox-not-started'});
      expect(await kit.outbox.release('key')).toEqual({type: 'outbox-not-started'});
      expect(await kit.outbox.drop('key')).toEqual({type: 'outbox-not-started'});
      expect(handle.find('key')).toEqual({type: 'outbox-not-started'});
      expect(kit.outbox.findByCorrelationKey('key')).toEqual({type: 'outbox-not-started'});
      expect(kit.outbox.lane('lane')).toEqual({type: 'outbox-not-started'});
      expect(kit.outbox.lanes()).toEqual({type: 'outbox-not-started'});
    });

    it('answers the reads with outcomes once started', async () => {
      const {kind, handle} = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: kind.name, correlationKey: 'stored', orderingKey: 'lane'}));
      await kit.start({run: false});

      expect(handle.find('stored')).toMatchObject({type: 'operation-found', operation: {correlationKey: 'stored'}});
      expect(handle.find('missing')).toEqual({type: 'operation-not-found'});
      expect(kit.outbox.findByCorrelationKey('stored')).toMatchObject({type: 'operation-found'});
      expect(kit.outbox.findByCorrelationKey('missing')).toEqual({type: 'operation-not-found'});
      expect(kit.outbox.lane('lane')).toMatchObject({type: 'lane-found', lane: {orderingKey: 'lane', size: 0}});
      expect(kit.outbox.lane('missing')).toEqual({type: 'lane-empty'});
      expect(kit.outbox.lanes()).toMatchObject({type: 'lanes-listed', lanes: [{orderingKey: 'lane'}]});
    });

    it('lists no lanes as lanes-listed once started', async () => {
      kit.registerKind();
      await kit.start({run: false});

      expect(kit.outbox.lanes()).toEqual({type: 'lanes-listed', lanes: []});
    });

    it('answers the reads of a stopped outbox with outbox-not-started', async () => {
      const {handle} = kit.registerKind();
      await kit.start();
      await kit.outbox.stop();

      expect(handle.find('key')).toEqual({type: 'outbox-not-started'});
      expect(kit.outbox.lanes()).toEqual({type: 'outbox-not-started'});
    });

    it('does not find an operation of another kind through the handle of a kind', async () => {
      const first = kit.registerKind();
      const second = kit.registerKind();
      await kit.start({run: false});
      await kit.enqueue(first, {correlationKey: 'key'});

      expect(second.handle.find('key')).toEqual({type: 'operation-not-found'});
      expect(first.handle.find('key')).toMatchObject({type: 'operation-found'});
    });

    it('does nothing when stopped before the start', async () => {
      await kit.outbox.stop();

      expect(kit.outbox.isStarted()).toBe(false);
      expect(await kit.outbox.start()).toEqual({type: 'outbox-started'});
    });
  });

  describe('loading', () => {
    it('loads the stored operations, in their lanes', async () => {
      const {kind, handle} = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: kind.name, correlationKey: 'stored', orderingKey: 'lane'}));

      await kit.start({run: false});

      expect(kit.findOperation('stored')?.payload).toEqual({text: 'stored'});
      expect(kit.laneOf('lane')?.first.correlationKey).toBe('stored');
      expect(handle.find('stored').type).toBe('operation-found');
    });

    it('retries an attempt that was running, as interrupted', async () => {
      const {kind, handle} = kit.registerKind();
      kit.store.seed(
        createStoredSnapshot({
          kind: kind.name,
          id: 'running',
          correlationKey: 'running',
          state: 'in-progress',
          attempts: 1,
        }),
      );

      await kit.start({run: false});

      expect(kit.findOperation('running')?.state).toBe('queued');
      expect(handle.find('running').type).toBe('operation-found');
      const newest = kit.store.history('running').at(-1);
      expect(newest).toMatchObject({trigger: 'attempt-interrupted', state: 'queued', seq: 2});
    });

    it('gives up on an interrupted attempt that was the last one, as the kind says', async () => {
      const {kind} = kit.registerKind({maxAttempts: 1});
      const dropping = kit.registerKind({maxAttempts: 1, whenGivenUp: 'drop'});
      kit.store.seed(
        createStoredSnapshot({kind: kind.name, id: 'a', correlationKey: 'a', state: 'in-progress', attempts: 1}),
      );
      kit.store.seed(
        createStoredSnapshot({
          kind: dropping.kind.name,
          id: 'b',
          correlationKey: 'b',
          state: 'in-progress',
          attempts: 1,
        }),
      );

      await kit.start({run: false});

      expect(kit.findOperation('a')?.state).toBe('dead-lettered');
      expect(kit.findOperation('b')).toBeUndefined();
      expect(kit.store.operationIds()).toEqual(['a']);
    });

    it('tells the kind once about an operation that was given up on at load, so it can untrack it', async () => {
      const dropping = kit.registerKind({maxAttempts: 1, whenGivenUp: 'drop'});
      kit.store.seed(
        createStoredSnapshot({
          kind: dropping.kind.name,
          id: 'b',
          correlationKey: 'b',
          state: 'in-progress',
          attempts: 1,
        }),
      );

      await kit.start({run: false});

      expect(
        dropping.changes.map(({state}) => {
          return state;
        }),
      ).toEqual(['dropped']);
    });

    it('deletes an operation whose newest snapshot has another schema version', async () => {
      const {kind} = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: kind.name, id: 'old', correlationKey: 'old', schemaVersion: 0}));

      await kit.start({run: false});

      expect(kit.findOperation('old')).toBeUndefined();
      expect(kit.store.operationIds()).toEqual([]);
    });

    it.each(['succeeded', 'dropped'] as const)(
      'deletes an operation whose newest snapshot is %s, left by an interrupted delete',
      async state => {
        const {kind} = kit.registerKind();
        kit.store.seed(createStoredSnapshot({kind: kind.name, id: 'done', correlationKey: 'done', state}));

        await kit.start({run: false});

        expect(kit.findOperation('done')).toBeUndefined();
        expect(kit.store.operationIds()).toEqual([]);
      },
    );

    it('deletes an operation whose payload no longer parses', async () => {
      const {kind} = kit.registerKind();
      kit.store.seed(
        createStoredSnapshot({kind: kind.name, id: 'bad', correlationKey: 'bad', payload: {unexpected: 1}}),
      );

      await kit.start({run: false});

      expect(kit.findOperation('bad')).toBeUndefined();
      expect(kit.store.operationIds()).toEqual([]);
    });

    it('deletes an operation whose kind is not registered', async () => {
      kit.store.seed(createStoredSnapshot({kind: 'gone', id: 'orphan', correlationKey: 'orphan'}));

      await kit.start({run: false});

      expect(kit.store.operationIds()).toEqual([]);
    });

    it('fails the start when the unusable operations cannot be deleted', async () => {
      kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: 'gone', id: 'orphan'}));
      kit.store.fail('remove', true);

      expect(await kit.outbox.start()).toEqual({type: 'storage-failed', errorName: 'TestFailure'});
      expect(kit.outbox.isStarted()).toBe(false);
    });

    it('calls onChanged once for each loaded operation', async () => {
      const queued = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: queued.kind.name, id: 'a', correlationKey: 'a'}));
      kit.store.seed(
        createStoredSnapshot({kind: queued.kind.name, id: 'b', correlationKey: 'b', state: 'in-progress', attempts: 1}),
      );

      await kit.start({run: false});

      expect(
        queued.changes
          .map(({id, state}) => {
            return [id, state];
          })
          .sort(),
      ).toEqual([
        ['a', 'queued'],
        ['b', 'queued'],
      ]);
    });

    it('keeps the lane order of the stored operations for what is enqueued afterwards', async () => {
      const {kind, handle} = kit.registerKind();
      kit.store.seed(
        createStoredSnapshot({
          kind: kind.name,
          id: 'stored',
          correlationKey: 'stored',
          orderingKey: 'lane',
          queuedSeq: 7,
        }),
      );
      await kit.start({run: false});

      await handle.enqueue({payload: {text: 'new'}, correlationKey: 'new', orderingKey: 'lane'});

      expect(kit.laneOf('lane')?.first.id).toBe('stored');
      expect(kit.store.history(kit.findOperation('new')?.id ?? '').at(-1)?.queuedSeq).toBe(8);
    });
  });

  describe('pause, resume and isRunning', () => {
    it('waits for resume after the start', async () => {
      const queued = kit.registerKind();
      await kit.start({run: false});

      await kit.enqueue(queued);

      expect(kit.outbox.isRunning()).toBe(false);
      expect(queued.performs).toHaveLength(0);
    });

    it('runs after resume', async () => {
      const queued = kit.registerKind();
      await kit.start({run: false});
      await kit.enqueue(queued);

      kit.outbox.resume();
      await kit.clock.settle();

      expect(kit.outbox.isRunning()).toBe(true);
      expect(queued.performs).toHaveLength(1);
    });

    it('stops new attempts on pause, and lets the one running finish', async () => {
      const queued = kit.registerKind();
      await kit.start();
      await kit.enqueue(queued, {correlationKey: 'first'});
      await kit.enqueue(queued, {correlationKey: 'second'});
      expect(queued.performs).toHaveLength(2);

      kit.outbox.pause();
      await kit.enqueue(queued, {correlationKey: 'third'});

      expect(kit.outbox.isRunning()).toBe(false);
      expect(queued.performs).toHaveLength(2);
      await queued.performs[0].answer({type: 'attempt-succeeded'});
      expect(kit.findOperation('first')).toBeUndefined();
      expect(queued.performs).toHaveLength(2);
    });

    it('remembers a resume before the start, and runs once started', async () => {
      const queued = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: queued.kind.name, correlationKey: 'stored'}));
      kit.outbox.resume();
      expect(kit.outbox.isRunning()).toBe(false);

      await kit.start({run: false});

      expect(kit.outbox.isRunning()).toBe(true);
      expect(queued.performs).toHaveLength(1);
    });

    it('remembers a pause before the start, which cancels an earlier resume', async () => {
      const queued = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: queued.kind.name, correlationKey: 'stored'}));
      kit.outbox.resume();
      kit.outbox.pause();

      await kit.start({run: false});

      expect(kit.outbox.isRunning()).toBe(false);
      expect(queued.performs).toHaveLength(0);
    });
  });

  describe('stop', () => {
    it('stops the outbox, which answers outbox-not-started again', async () => {
      const queued = kit.registerKind();
      await kit.start();

      await kit.outbox.stop();

      expect(kit.outbox.isStarted()).toBe(false);
      expect(kit.outbox.isRunning()).toBe(false);
      expect(await queued.handle.enqueue({payload: {text: 'late'}})).toEqual({type: 'outbox-not-started'});
    });

    it('aborts a running attempt and leaves the operation stored as it was', async () => {
      const queued = kit.registerKind();
      await kit.start();
      const outcome = await kit.enqueue(queued, {correlationKey: 'key'});
      const {signal} = queued.lastPerform();

      await kit.outbox.stop();

      expect(signal.aborted).toBe(true);
      const id = outcome.type === 'operation-queued' ? outcome.operation.id : '';
      expect(kit.store.history(id).at(-1)?.state).toBe('in-progress');
    });

    it('ignores what an aborted attempt answers afterwards', async () => {
      const queued = kit.registerKind();
      await kit.start();
      const outcome = await kit.enqueue(queued, {correlationKey: 'key'});
      const attempt = queued.lastPerform();
      await kit.outbox.stop();

      await attempt.answer({type: 'attempt-succeeded'});

      const id = outcome.type === 'operation-queued' ? outcome.operation.id : '';
      expect(kit.store.history(id).at(-1)?.state).toBe('in-progress');
    });

    it('can be started again, and interrupts the attempt that was running', async () => {
      const queued = kit.registerKind();
      await kit.start();
      await kit.enqueue(queued, {correlationKey: 'key'});
      await kit.outbox.stop();

      await kit.start();

      expect(queued.operation('key')?.state).toBe('in-progress');
      expect(queued.performs).toHaveLength(2);
      expect(queued.performs[1].operation.attempts).toBe(2);
    });
  });

  describe('logging', () => {
    it('logs each call next to its outcome, and never the payload or the keys', async () => {
      const queued = kit.registerKind();
      await kit.start();

      await kit.enqueue(queued, {
        correlationKey: 'private-key-1',
        orderingKey: 'private-lane-1',
        payload: {text: 'secret'},
      });
      await kit.outbox.hold('missing');
      await kit.outbox.release('missing');
      await kit.outbox.drop('private-key-1');
      await kit.outbox.stop();

      expect(kit.logger.entriesOf('enqueue')[0].attributes).toMatchObject({outcome: 'operation-queued'});
      expect(kit.logger.entriesOf('hold')[0].attributes).toMatchObject({outcome: 'operation-not-found'});
      expect(kit.logger.entriesOf('release')[0].attributes).toMatchObject({outcome: 'operation-not-found'});
      expect(kit.logger.entriesOf('drop')[0].attributes).toMatchObject({outcome: 'operation-dropped'});
      expect(kit.logger.entriesOf('start')[0].attributes).toMatchObject({outcome: 'outbox-started'});
      expect(kit.logger.entriesOf('stop')).toHaveLength(1);
      expect(JSON.stringify(kit.logger.entries)).not.toContain('secret');
      expect(JSON.stringify(kit.logger.entries)).not.toContain('private-key-1');
      expect(JSON.stringify(kit.logger.entries)).not.toContain('private-lane-1');
    });

    it('logs the names of the registered kinds, and nothing else about them, when it starts', async () => {
      const first = kit.registerKind();
      const second = kit.registerKind({expiresAfterMilliseconds: 123_456});

      await kit.start({run: false});

      expect(kit.logger.entriesOf('register')).toEqual([
        {level: 'info', message: 'register', attributes: {kinds: [first.kind.name, second.kind.name]}},
      ]);
    });

    it('logs pause, resume and stop once the outbox runs, with what they did', async () => {
      kit.registerKind();
      await kit.start({run: false});

      kit.outbox.resume();
      kit.outbox.pause();
      await kit.outbox.stop();

      expect(kit.logger.entriesOf('resume')).toEqual([
        {level: 'info', message: 'resume', attributes: {outcome: 'outbox-resumed'}},
      ]);
      expect(kit.logger.entriesOf('pause')).toEqual([
        {level: 'info', message: 'pause', attributes: {outcome: 'outbox-paused'}},
      ]);
      expect(kit.logger.entriesOf('stop')).toEqual([
        {level: 'info', message: 'stop', attributes: {outcome: 'outbox-stopped'}},
      ]);
    });

    it('logs a resume remembered before the start when the outbox starts, and then that it took effect', async () => {
      kit.registerKind();
      kit.outbox.resume();
      expect(kit.logger.entries).toEqual([]);

      await kit.start({run: false});

      expect(
        kit.logger.entriesOf('resume').map(({attributes}) => {
          return attributes;
        }),
      ).toEqual([{outcome: 'outbox-remembered-until-start'}, {outcome: 'outbox-resumed'}]);
    });

    it('logs only the last of a pause and a resume called before the start', async () => {
      kit.registerKind();
      kit.outbox.resume();
      kit.outbox.pause();

      await kit.start({run: false});

      expect(kit.logger.entriesOf('resume')).toEqual([]);
      expect(
        kit.logger.entriesOf('pause').map(({attributes}) => {
          return attributes;
        }),
      ).toEqual([{outcome: 'outbox-remembered-until-start'}]);
    });

    it('logs the name of the error of a failed store', async () => {
      kit.store.rejectWith('loadLatest', new RangeError('broken'));

      await kit.outbox.start();

      expect(kit.logger.entriesOf('start')[0].attributes).toMatchObject({
        outcome: 'storage-failed',
        errorName: 'RangeError',
      });
    });
  });
});
