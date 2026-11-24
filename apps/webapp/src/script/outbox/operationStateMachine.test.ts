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

import {operationStateMachine, resolveTarget, type GuardContext} from './operationStateMachine';
import type {OperationState, Trigger} from './types';

type MachineState = OperationState | 'initial';

const hasAttemptsLeft: GuardContext = {attempts: 1, maxAttempts: 3, whenGivenUp: 'dead-letter'};
const noAttemptsLeftDeadLetters: GuardContext = {attempts: 3, maxAttempts: 3, whenGivenUp: 'dead-letter'};
const noAttemptsLeftDrops: GuardContext = {attempts: 3, maxAttempts: 3, whenGivenUp: 'drop'};
const deadLettersWhenGivenUp = hasAttemptsLeft;
const dropsWhenGivenUp: GuardContext = {...hasAttemptsLeft, whenGivenUp: 'drop'};

const allStates: MachineState[] = [
  'initial',
  'queued',
  'on-hold',
  'in-progress',
  'dead-lettered',
  'succeeded',
  'dropped',
];
const allTriggers: Trigger[] = [
  'operation-queued',
  'operation-versioned',
  'operation-held',
  'operation-released',
  'operation-dropped',
  'operation-dead-lettered',
  'operation-expired',
  'lane-dead-lettered',
  'lane-dropped',
  'attempt-started',
  'attempt-succeeded',
  'attempt-failed',
  'attempt-timed-out',
  'attempt-errored',
  'attempt-interrupted',
];

const failedAttemptTriggers: Trigger[] = [
  'attempt-failed',
  'attempt-timed-out',
  'attempt-errored',
  'attempt-interrupted',
];

describe('operationStateMachine', () => {
  describe('plain transitions', () => {
    const rows: [MachineState, Trigger, OperationState][] = [
      ['initial', 'operation-queued', 'queued'],
      ['queued', 'attempt-started', 'in-progress'],
      ['queued', 'operation-versioned', 'queued'],
      ['queued', 'operation-held', 'on-hold'],
      ['queued', 'operation-dropped', 'dropped'],
      ['on-hold', 'operation-released', 'queued'],
      ['on-hold', 'operation-versioned', 'queued'],
      ['on-hold', 'operation-dropped', 'dropped'],
      ['in-progress', 'attempt-succeeded', 'succeeded'],
      ['queued', 'lane-dead-lettered', 'dead-lettered'],
      ['queued', 'lane-dropped', 'dropped'],
      ['on-hold', 'lane-dead-lettered', 'dead-lettered'],
      ['on-hold', 'lane-dropped', 'dropped'],
      ['in-progress', 'operation-held', 'on-hold'],
      ['in-progress', 'operation-dead-lettered', 'dead-lettered'],
      ['in-progress', 'operation-dropped', 'dropped'],
      ['dead-lettered', 'operation-versioned', 'queued'],
      ['dead-lettered', 'operation-dropped', 'dropped'],
    ];

    it.each(rows)('%s on %s leads to %s', (from, trigger, target) => {
      expect(resolveTarget(from, trigger, hasAttemptsLeft)).toBe(target);
    });
  });

  describe('failed attempts', () => {
    it.each(failedAttemptTriggers)('%s retries while there are attempts left', trigger => {
      expect(resolveTarget('in-progress', trigger, hasAttemptsLeft)).toBe('queued');
    });

    it.each(failedAttemptTriggers)('%s dead-letters without attempts left when the kind dead-letters', trigger => {
      expect(resolveTarget('in-progress', trigger, noAttemptsLeftDeadLetters)).toBe('dead-lettered');
    });

    it.each(failedAttemptTriggers)('%s drops without attempts left when the kind drops', trigger => {
      expect(resolveTarget('in-progress', trigger, noAttemptsLeftDrops)).toBe('dropped');
    });
  });

  describe('expiry', () => {
    it.each(['queued', 'on-hold'] as const)('%s dead-letters on expired when the kind dead-letters', state => {
      expect(resolveTarget(state, 'operation-expired', deadLettersWhenGivenUp)).toBe('dead-lettered');
    });

    it.each(['queued', 'on-hold'] as const)('%s drops on expired when the kind drops', state => {
      expect(resolveTarget(state, 'operation-expired', dropsWhenGivenUp)).toBe('dropped');
    });

    it('expires regardless of the attempts left', () => {
      expect(resolveTarget('queued', 'operation-expired', hasAttemptsLeft)).toBe('dead-lettered');
    });
  });

  describe('refused triggers', () => {
    const listed = (state: MachineState, trigger: Trigger): boolean => {
      return operationStateMachine[state].on?.[trigger] !== undefined;
    };
    const unlisted = allStates.flatMap(state => {
      return allTriggers
        .filter(trigger => {
          return !listed(state, trigger);
        })
        .map(trigger => {
          return [state, trigger] as const;
        });
    });

    it('has trigger pairs that the table does not list', () => {
      expect(unlisted.length).toBeGreaterThan(0);
    });

    it.each(unlisted)('%s refuses %s', (state, trigger) => {
      expect(resolveTarget(state, trigger, hasAttemptsLeft)).toBeUndefined();
    });

    it.each(['succeeded', 'dropped'] as const)('%s is final and accepts nothing', state => {
      for (const trigger of allTriggers) {
        expect(resolveTarget(state, trigger, hasAttemptsLeft)).toBeUndefined();
      }
    });
  });
});
