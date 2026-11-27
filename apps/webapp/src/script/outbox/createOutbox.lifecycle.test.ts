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

describe('createOutbox lifecycle', () => {
  let kit: OutboxTestKit;

  beforeEach(() => {
    kit = createOutboxTestKit();
  });

  describe('register', () => {
    it('registers a kind and hands out its handle', () => {
      const result = kit.outbox.register({...kit.registerKind().kind, name: 'another'});

      expect(result).toEqual({
        outcome: 'kind-registered',
        handle: {enqueue: expect.any(Function), find: expect.any(Function)},
      });
    });

    it('refuses a name that is taken', () => {
      const {kind} = kit.registerKind();

      expect(kit.outbox.register(kind)).toEqual({outcome: 'kind-name-taken', kind: kind.name});
    });

    it('refuses a kind once the outbox has started', async () => {
      const {kind} = kit.registerKind();
      await kit.start();

      expect(kit.outbox.register({...kind, name: 'late'})).toEqual({outcome: 'outbox-already-started'});
    });

    it('refuses a kind while the outbox is loading', async () => {
      const {kind} = kit.registerKind();
      const starting = kit.outbox.start();

      expect(kit.outbox.register({...kind, name: 'late'})).toEqual({outcome: 'outbox-already-started'});
      await starting;
    });

    it('registers a kind after stop, which the next start runs', async () => {
      kit.registerKind();
      await kit.start();
      await kit.outbox.stop();

      const lateKind = kit.registerKind();
      await kit.start();
      await kit.enqueue(lateKind);

      expect(lateKind.attempts).toHaveLength(1);
    });
  });

  describe('start', () => {
    it('starts and reports itself started', async () => {
      kit.registerKind();

      expect(await kit.outbox.start()).toEqual({outcome: 'outbox-started'});
      expect(kit.outbox.isStarted()).toBe(true);
    });

    it('does not run until it is resumed', async () => {
      kit.registerKind();

      await kit.start({run: false});

      expect(kit.outbox.isStarted()).toBe(true);
      expect(kit.outbox.isRunning()).toBe(false);
    });

    it('refuses a second start', async () => {
      await kit.start();

      expect(await kit.outbox.start()).toEqual({outcome: 'outbox-already-started'});
    });

    it('refuses a start while another is loading', async () => {
      const firstStart = kit.outbox.start();

      expect(await kit.outbox.start()).toEqual({outcome: 'outbox-already-started'});
      expect(await firstStart).toEqual({outcome: 'outbox-started'});
    });

    it('reports itself not started while loading', async () => {
      const starting = kit.outbox.start();

      expect(kit.outbox.isStarted()).toBe(false);
      await starting;
    });

    it('stays unstarted when the store fails', async () => {
      kit.store.fail('loadLatest', true);

      expect(await kit.outbox.start()).toEqual({outcome: 'storage-failed', errorName: 'TestFailure'});
      expect(kit.outbox.isStarted()).toBe(false);
    });

    it('starts again after a storage failure', async () => {
      const testKind = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: testKind.kind.name, correlation: correlated('stored')}));
      kit.store.fail('loadLatest', true);
      await kit.outbox.start();
      kit.store.fail('loadLatest', false);

      expect(await kit.outbox.start()).toEqual({outcome: 'outbox-started'});
      expect(kit.outbox.isStarted()).toBe(true);
      expect(kit.outbox.findByCorrelationKey('stored')).toMatchObject({outcome: 'operation-found'});
    });

    it('answers storage-failed when the store rejects', async () => {
      kit.store.rejectWith('loadLatest', new RangeError('broken'));

      expect(await kit.outbox.start()).toEqual({outcome: 'storage-failed', errorName: 'RangeError'});
      expect(kit.outbox.isStarted()).toBe(false);
    });

    it('answers storage-full when storing the interrupted attempt hits the quota', async () => {
      const {kind} = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: kind.name, state: 'in-progress', attempts: 1}));
      kit.store.fill(true);

      expect(await kit.outbox.start()).toEqual({outcome: 'storage-full'});
      expect(kit.outbox.isStarted()).toBe(false);
    });

    it('fails the start when the unusable operations cannot be deleted', async () => {
      kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: 'gone', id: 'orphan'}));
      kit.store.fail('remove', true);

      expect(await kit.outbox.start()).toEqual({outcome: 'storage-failed', errorName: 'TestFailure'});
      expect(kit.outbox.isStarted()).toBe(false);
    });

    it('starts again after the unusable operations could not be deleted, and deletes them then', async () => {
      kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: 'gone', id: 'orphan'}));
      kit.store.fail('remove', true);
      await kit.outbox.start();
      kit.store.fail('remove', false);

      expect(await kit.outbox.start()).toEqual({outcome: 'outbox-started'});
      expect(kit.store.operationIds()).toEqual([]);
    });

    it('does not run attempts of a failed start', async () => {
      const testKind = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: testKind.kind.name, state: 'in-progress', attempts: 1}));
      kit.store.fill(true);
      kit.outbox.resume();

      await kit.outbox.start();
      await kit.clock.settle();

      expect(testKind.attempts).toHaveLength(0);
    });
  });

  describe('calls while the outbox is not started', () => {
    it('answers every command outbox-not-started before the start', async () => {
      const {handle} = kit.registerKind();

      expect(await handle.enqueue({payload: {text: 'early'}, correlationKey: 'key'})).toEqual({
        outcome: 'outbox-not-started',
      });
      expect(await kit.outbox.hold('key')).toEqual({outcome: 'outbox-not-started'});
      expect(await kit.outbox.release('key')).toEqual({outcome: 'outbox-not-started'});
      expect(await kit.outbox.deadLetter('key')).toEqual({outcome: 'outbox-not-started'});
      expect(await kit.outbox.delete('key')).toEqual({outcome: 'outbox-not-started'});
    });

    it('answers every read outbox-not-started before the start', () => {
      const {handle} = kit.registerKind();

      expect(handle.find('key')).toEqual({outcome: 'outbox-not-started'});
      expect(kit.outbox.findByCorrelationKey('key')).toEqual({outcome: 'outbox-not-started'});
      expect(kit.outbox.lane('lane')).toEqual({outcome: 'outbox-not-started'});
      expect(kit.outbox.lanes()).toEqual({outcome: 'outbox-not-started'});
    });

    it('answers the commands outbox-not-started while it is loading', async () => {
      const {handle} = kit.registerKind();
      const starting = kit.outbox.start();

      expect(await handle.enqueue({payload: {text: 'early'}, correlationKey: 'key'})).toEqual({
        outcome: 'outbox-not-started',
      });
      expect(await kit.outbox.delete('key')).toEqual({outcome: 'outbox-not-started'});
      await starting;
    });
  });

  describe('reads once started', () => {
    it('finds an operation by its correlation key, through the outbox and through the handle of its kind', async () => {
      const testKind = kit.registerKind();
      await kit.start({run: false});
      await kit.enqueue(testKind, {correlationKey: 'key'});

      expect(testKind.handle.find('key')).toMatchObject({outcome: 'operation-found', operation: {id: 'operation-1'}});
      expect(kit.outbox.findByCorrelationKey('key')).toMatchObject({
        outcome: 'operation-found',
        operation: {id: 'operation-1'},
      });
    });

    it('does not find an operation nothing has enqueued', async () => {
      const testKind = kit.registerKind();
      await kit.start({run: false});

      expect(testKind.handle.find('missing')).toEqual({outcome: 'operation-not-found'});
      expect(kit.outbox.findByCorrelationKey('missing')).toEqual({outcome: 'operation-not-found'});
    });

    it('does not find an operation of another kind through the handle of a kind', async () => {
      const first = kit.registerKind();
      const second = kit.registerKind();
      await kit.start({run: false});
      await kit.enqueue(first, {correlationKey: 'key'});

      expect(second.handle.find('key')).toEqual({outcome: 'operation-not-found'});
      expect(kit.outbox.findByCorrelationKey('key')).toMatchObject({outcome: 'operation-found'});
    });

    it('lists no lanes when no operation is in one', async () => {
      kit.registerKind();
      await kit.start({run: false});

      expect(kit.outbox.lanes()).toEqual({outcome: 'lanes-listed', lanes: []});
      expect(kit.outbox.lane('lane')).toEqual({outcome: 'lane-empty'});
    });
  });

  describe('pause, resume, isRunning', () => {
    it('is not running before the start, however often it was resumed', () => {
      kit.registerKind();

      kit.outbox.resume();

      expect(kit.outbox.isRunning()).toBe(false);
    });

    it('waits for resume after the start', async () => {
      const testKind = kit.registerKind();
      await kit.start({run: false});

      await kit.enqueue(testKind);

      expect(kit.outbox.isRunning()).toBe(false);
      expect(testKind.attempts).toHaveLength(0);
    });

    it('runs the queued operations after resume', async () => {
      const testKind = kit.registerKind();
      await kit.start({run: false});
      await kit.enqueue(testKind);

      kit.outbox.resume();
      await kit.clock.settle();

      expect(kit.outbox.isRunning()).toBe(true);
      expect(testKind.attempts).toHaveLength(1);
    });

    it('lets the attempt that is running finish after pause, and starts no other', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'first'});
      await kit.enqueue(testKind, {correlationKey: 'second'});

      kit.outbox.pause();
      await kit.enqueue(testKind, {correlationKey: 'third'});

      expect(kit.outbox.isRunning()).toBe(false);
      expect(testKind.attempts).toHaveLength(2);

      await testKind.attempts[0].answer({outcome: 'attempt-succeeded'});

      expect(kit.outbox.findByCorrelationKey('first')).toEqual({outcome: 'operation-not-found'});
      expect(testKind.attempts).toHaveLength(2);
    });

    it('runs the queued operations again after pause and resume', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      kit.outbox.pause();
      await kit.enqueue(testKind, {correlationKey: 'key'});

      kit.outbox.resume();
      await kit.clock.settle();

      expect(testKind.attempts).toHaveLength(1);
    });

    it('remembers a resume before the start, and runs once started', async () => {
      const testKind = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: testKind.kind.name}));
      kit.outbox.resume();

      await kit.start({run: false});

      expect(kit.outbox.isRunning()).toBe(true);
      expect(testKind.attempts).toHaveLength(1);
    });

    it('remembers a pause before the start, which cancels an earlier resume', async () => {
      const testKind = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: testKind.kind.name}));
      kit.outbox.resume();
      kit.outbox.pause();

      await kit.start({run: false});

      expect(kit.outbox.isRunning()).toBe(false);
      expect(testKind.attempts).toHaveLength(0);
    });

    it('counts a resume while loading', async () => {
      const testKind = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: testKind.kind.name}));
      const starting = kit.outbox.start();

      kit.outbox.resume();
      await starting;
      await kit.clock.settle();

      expect(kit.outbox.isRunning()).toBe(true);
      expect(testKind.attempts).toHaveLength(1);
    });

    it('counts a pause while loading', async () => {
      const testKind = kit.registerKind();
      kit.store.seed(createStoredSnapshot({kind: testKind.kind.name}));
      kit.outbox.resume();
      const starting = kit.outbox.start();

      kit.outbox.pause();
      await starting;
      await kit.clock.settle();

      expect(kit.outbox.isRunning()).toBe(false);
      expect(testKind.attempts).toHaveLength(0);
    });
  });

  describe('stop', () => {
    it('stops the outbox, which is neither started nor running afterwards', async () => {
      kit.registerKind();
      await kit.start();

      await kit.outbox.stop();

      expect(kit.outbox.isStarted()).toBe(false);
      expect(kit.outbox.isRunning()).toBe(false);
    });

    it('does nothing when it was not started', async () => {
      await kit.outbox.stop();

      expect(kit.outbox.isStarted()).toBe(false);
      expect(await kit.outbox.start()).toEqual({outcome: 'outbox-started'});
    });

    it('answers every command and read outbox-not-started afterwards', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key', laneKey: 'lane'});
      await kit.outbox.stop();

      expect(await testKind.handle.enqueue({payload: {text: 'late'}})).toEqual({outcome: 'outbox-not-started'});
      expect(await kit.outbox.hold('key')).toEqual({outcome: 'outbox-not-started'});
      expect(await kit.outbox.release('key')).toEqual({outcome: 'outbox-not-started'});
      expect(await kit.outbox.deadLetter('key')).toEqual({outcome: 'outbox-not-started'});
      expect(await kit.outbox.delete('key')).toEqual({outcome: 'outbox-not-started'});
      expect(testKind.handle.find('key')).toEqual({outcome: 'outbox-not-started'});
      expect(kit.outbox.findByCorrelationKey('key')).toEqual({outcome: 'outbox-not-started'});
      expect(kit.outbox.lane('lane')).toEqual({outcome: 'outbox-not-started'});
      expect(kit.outbox.lanes()).toEqual({outcome: 'outbox-not-started'});
    });

    it('aborts a running attempt and leaves the operation stored as it was', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});
      const {signal} = testKind.lastAttempt();

      await kit.outbox.stop();

      expect(signal.aborted).toBe(true);
      expect(kit.store.history('operation-1').at(-1)).toMatchObject({state: 'in-progress'});
    });

    it('ignores what an aborted attempt answers afterwards', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});
      const attempt = testKind.lastAttempt();
      await kit.outbox.stop();

      await attempt.answer({outcome: 'attempt-succeeded'});

      expect(kit.store.history('operation-1').at(-1)).toMatchObject({state: 'in-progress'});
    });

    it('arms no timer afterwards', async () => {
      const testKind = kit.registerKind({attemptTimeoutMilliseconds: 10_000});
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});
      await testKind.lastAttempt().answer({outcome: 'attempt-failed'});

      await kit.outbox.stop();

      expect(kit.clock.pendingTimers()).toEqual([]);
    });

    it('starts no attempt after a restart that was not resumed', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await kit.outbox.stop();

      await kit.start({run: false});
      await kit.enqueue(testKind);

      expect(testKind.attempts).toHaveLength(0);
    });

    it('can be started again, which interrupts the attempt that was running and retries it', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});
      await kit.outbox.stop();

      await kit.start();

      expect(kit.store.history('operation-1').at(-2)).toMatchObject({state: 'queued', trigger: 'attempt-interrupted'});
      expect(kit.operation('key')).toMatchObject({state: 'in-progress', attempts: 2});
      expect(testKind.attempts).toHaveLength(2);
    });

    it('starts again after a failed restart', async () => {
      const testKind = kit.registerKind();
      await kit.start();
      await kit.enqueue(testKind, {correlationKey: 'key'});
      await kit.outbox.stop();
      kit.store.fail('loadLatest', true);
      await kit.outbox.start();
      kit.store.fail('loadLatest', false);

      await kit.start();

      expect(kit.operation('key')).toMatchObject({state: 'in-progress', attempts: 2});
    });
  });

  describe('logging', () => {
    it('logs each call next to its outcome, and never the payload or the keys', async () => {
      const testKind = kit.registerKind();
      await kit.start();

      await kit.enqueue(testKind, {
        correlationKey: 'private-key-1',
        laneKey: 'private-lane-1',
        payload: {text: 'secret'},
      });
      await kit.outbox.hold('missing');
      await kit.outbox.release('missing');
      await kit.outbox.deadLetter('private-key-1');
      await kit.outbox.delete('private-key-1');
      await kit.outbox.stop();

      expect(kit.logger.entriesOf('enqueue')[0].attributes).toMatchObject({outcome: 'operation-queued'});
      expect(kit.logger.entriesOf('hold')[0].attributes).toMatchObject({outcome: 'operation-not-found'});
      expect(kit.logger.entriesOf('release')[0].attributes).toMatchObject({outcome: 'operation-not-found'});
      expect(kit.logger.entriesOf('deadLetter')[0].attributes).toMatchObject({outcome: 'operation-dead-lettered'});
      expect(kit.logger.entriesOf('delete')[0].attributes).toMatchObject({outcome: 'operation-deleted'});
      expect(kit.logger.entriesOf('start')[0].attributes).toMatchObject({outcome: 'outbox-started'});
      expect(kit.logger.entriesOf('stop')).toHaveLength(1);
      const logged = JSON.stringify(kit.logger.entries);
      expect(logged).not.toContain('secret');
      expect(logged).not.toContain('private-key-1');
      expect(logged).not.toContain('private-lane-1');
    });

    it('logs the names of the registered kinds, and nothing else about them, when it starts', async () => {
      const first = kit.registerKind();
      const second = kit.registerKind({expiresAfterMilliseconds: 123_456});

      await kit.start({run: false});

      expect(kit.logger.entriesOf('register')).toEqual([
        {level: 'info', message: 'register', attributes: {kinds: [first.kind.name, second.kind.name]}},
      ]);
    });

    it('logs pause, resume and stop with what they did', async () => {
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

    it('logs a resume remembered before the start, and then that it took effect', async () => {
      kit.registerKind();
      kit.outbox.resume();

      await kit.start({run: false});

      expect(
        kit.logger.entriesOf('resume').map(({attributes}) => {
          return attributes;
        }),
      ).toEqual([{outcome: 'outbox-remembered-until-start'}, {outcome: 'outbox-resumed'}]);
    });

    it('logs a resume and a pause called before the start as remembered until the start', async () => {
      kit.registerKind();
      kit.outbox.resume();
      kit.outbox.pause();

      await kit.start({run: false});

      expect(
        kit.logger.entriesOf('pause').map(({attributes}) => {
          return attributes;
        }),
      ).toEqual([{outcome: 'outbox-remembered-until-start'}]);
      expect(
        kit.logger.entriesOf('resume').map(({attributes}) => {
          return attributes;
        }),
      ).toEqual([{outcome: 'outbox-remembered-until-start'}]);
    });

    it('logs the name of the error of a failed store', async () => {
      kit.store.rejectWith('loadLatest', new RangeError('broken'));

      await kit.outbox.start();

      expect(kit.logger.entriesOf('start')[0].attributes).toEqual({outcome: 'storage-failed', errorName: 'RangeError'});
    });
  });
});
