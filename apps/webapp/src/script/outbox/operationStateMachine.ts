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

import type {OperationState, Trigger} from './types';

type MachineState = OperationState | 'initial';
type Guard = 'has-attempts-left' | 'drops-when-given-up';
type GuardedTarget = {guard?: Guard; target: OperationState};
type Transition = OperationState | readonly GuardedTarget[];

/** What the guards read: the operation's attempts and its kind's limits, resolved to their defaults */
export type GuardContext = {attempts: number; maxAttempts: number; whenGivenUp: 'dead-letter' | 'drop'};

export const FINAL_STATES: readonly OperationState[] = ['succeeded', 'dropped'];

const operationGivenUp: readonly GuardedTarget[] = [
  {guard: 'drops-when-given-up', target: 'dropped'},
  {target: 'dead-lettered'},
];
const attemptFailed: readonly GuardedTarget[] = [{guard: 'has-attempts-left', target: 'queued'}, ...operationGivenUp];

type StateEntry = {on?: Partial<Record<Trigger, Transition>>};

export const operationStateMachine: Record<MachineState, StateEntry> = {
  initial: {on: {'operation-queued': 'queued'}},
  queued: {
    on: {
      'attempt-started': 'in-progress',
      'operation-versioned': 'queued',
      'operation-held': 'on-hold',
      'operation-expired': operationGivenUp,
      'operation-dropped': 'dropped',
      'lane-dead-lettered': 'dead-lettered',
      'lane-dropped': 'dropped',
    },
  },
  'on-hold': {
    on: {
      'operation-released': 'queued',
      'operation-versioned': 'queued',
      'operation-expired': operationGivenUp,
      'operation-dropped': 'dropped',
      'lane-dead-lettered': 'dead-lettered',
      'lane-dropped': 'dropped',
    },
  },
  'in-progress': {
    on: {
      'attempt-succeeded': 'succeeded',
      'attempt-failed': attemptFailed,
      'attempt-timed-out': attemptFailed,
      'attempt-errored': attemptFailed,
      'attempt-interrupted': attemptFailed,
      'operation-held': 'on-hold',
      'operation-dead-lettered': 'dead-lettered',
      'operation-dropped': 'dropped',
    },
  },
  'dead-lettered': {on: {'operation-versioned': 'queued', 'operation-dropped': 'dropped'}},
  succeeded: {},
  dropped: {},
};

const guards: Record<Guard, (context: GuardContext) => boolean> = {
  'has-attempts-left': ({attempts, maxAttempts}) => {
    return attempts < maxAttempts;
  },
  'drops-when-given-up': ({whenGivenUp}) => {
    return whenGivenUp === 'drop';
  },
};

/** The state the trigger leads to, or `undefined` when the state doesn't list the trigger */
export function resolveTarget(from: MachineState, trigger: Trigger, context: GuardContext): OperationState | undefined {
  const transition = operationStateMachine[from].on?.[trigger];
  if (transition === undefined || typeof transition === 'string') {
    return transition;
  }
  return transition.find(({guard}) => {
    return guard === undefined || guards[guard](context);
  })?.target;
}
