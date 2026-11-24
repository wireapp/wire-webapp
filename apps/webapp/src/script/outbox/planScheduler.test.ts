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

import {isDueToExpire, planScheduler, type SchedulerSituation} from './planScheduler';
import {createStoredSnapshot} from './testing/createOutboxTestKit';
import type {OperationSnapshot} from './types';

function operation(id: string, overrides: Partial<OperationSnapshot> = {}): OperationSnapshot {
  return createStoredSnapshot({kind: 'kind', id, queuedSeq: Number(id.replace(/\D/g, '')) || 1, ...overrides});
}

function plan(
  operations: OperationSnapshot[],
  overrides: Partial<SchedulerSituation> = {},
): ReturnType<typeof planScheduler> {
  return planScheduler({
    operations,
    serverNow: 1_000,
    isRunning: true,
    backoffRemainingMilliseconds: 0,
    operationIdsWithWaitingCommands: new Set(),
    afterStoreFailure: false,
    ...overrides,
  });
}

describe('planScheduler', () => {
  describe('what starts', () => {
    it('starts every queued operation without an ordering key, in queue order', () => {
      const operations = [operation('b2'), operation('a1')];

      expect(plan(operations).start).toEqual(['a1', 'b2']);
    });

    it('starts only the first operation of a lane', () => {
      const operations = [
        operation('a1', {orderingKey: 'lane'}),
        operation('a2', {orderingKey: 'lane'}),
        operation('b3', {orderingKey: 'other'}),
      ];

      expect(plan(operations).start).toEqual(['a1', 'b3']);
    });

    it('starts nothing in a lane whose first operation is on hold, or running', () => {
      const operations = [
        operation('a1', {orderingKey: 'held', state: 'on-hold'}),
        operation('a2', {orderingKey: 'held'}),
        operation('b3', {orderingKey: 'busy', state: 'in-progress'}),
        operation('b4', {orderingKey: 'busy'}),
      ];

      expect(plan(operations).start).toEqual([]);
    });

    it('skips a dead-lettered operation: the next one in its lane starts', () => {
      const operations = [
        operation('a1', {orderingKey: 'lane', state: 'dead-lettered'}),
        operation('a2', {orderingKey: 'lane'}),
      ];

      expect(plan(operations).start).toEqual(['a2']);
    });

    it('does not start an operation that commands are waiting on', () => {
      const operations = [operation('a1'), operation('b2')];

      expect(plan(operations, {operationIdsWithWaitingCommands: new Set(['a1'])}).start).toEqual(['b2']);
    });

    it('starts nothing while paused, or during the backoff', () => {
      const operations = [operation('a1')];

      expect(plan(operations, {isRunning: false}).start).toEqual([]);
      expect(plan(operations, {backoffRemainingMilliseconds: 1}).start).toEqual([]);
    });
  });

  describe('what expires', () => {
    it('expires a queued or held operation whose time has come, even while paused or in backoff', () => {
      const operations = [
        operation('a1', {validUntil: 1_000}),
        operation('b2', {validUntil: 999, state: 'on-hold'}),
        operation('c3', {validUntil: 1_001}),
        operation('d4'),
      ];

      const planned = plan(operations, {isRunning: false, backoffRemainingMilliseconds: 500});

      expect(planned.expire).toEqual(['a1', 'b2']);
    });

    it('does not expire a running or dead-lettered operation', () => {
      const operations = [
        operation('a1', {validUntil: 0, state: 'in-progress'}),
        operation('b2', {validUntil: 0, state: 'dead-lettered'}),
      ];

      expect(plan(operations).expire).toEqual([]);
      expect(isDueToExpire(operations[0], 1_000)).toBe(false);
    });
  });

  describe('when to look again', () => {
    it('has nothing to wait for without expiry or backoff', () => {
      expect(plan([operation('a1')]).wakeInMilliseconds).toBeUndefined();
    });

    it('wakes for the nearest expiry', () => {
      const operations = [operation('a1', {validUntil: 1_700}), operation('b2', {validUntil: 1_300})];

      expect(plan(operations).wakeInMilliseconds).toBe(300);
    });

    it('wakes at the end of the backoff when something queued waits for it', () => {
      const planned = plan([operation('a1')], {backoffRemainingMilliseconds: 250});

      expect(planned.wakeInMilliseconds).toBe(250);
    });

    it('does not wake for the backoff while paused, or without a queued operation', () => {
      expect(
        plan([operation('a1')], {isRunning: false, backoffRemainingMilliseconds: 250}).wakeInMilliseconds,
      ).toBeUndefined();
      expect(
        plan([operation('a1', {state: 'on-hold'})], {backoffRemainingMilliseconds: 250}).wakeInMilliseconds,
      ).toBeUndefined();
    });

    it('waits for the backoff before looking at an expiry that is due, after the store failed', () => {
      const operations = [operation('a1', {validUntil: 900})];

      const planned = plan(operations, {afterStoreFailure: true, backoffRemainingMilliseconds: 400});

      expect(planned.wakeInMilliseconds).toBe(400);
    });
  });
});
