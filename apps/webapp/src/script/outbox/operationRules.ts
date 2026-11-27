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

import {noop} from 'noop-esm';
import {match} from 'ts-pattern';

import {isInState} from './tagged';
import type {
  AttemptOutcome,
  AttemptTimeout,
  Correlation,
  EnqueueRequest,
  Expiry,
  Kind,
  Lane,
  Cascade,
  LaneMembership,
  LaneSetting,
  OperationData,
  OperationSnapshot,
  OperationState,
  OperationView,
  Outcome,
  OutboxConfiguration,
  State,
  Trigger,
} from './types';

export const SCHEMA_VERSION = 3;

// Kind and configuration, resolved once at the edge

type WhenExhausted = 'dead-letter' | 'delete';
type EndedState = 'dead-lettered' | 'deleted';
export type LaneSettings = Record<EndedState, LaneSetting>;
export type ExpiryLimit = State<'expires-after', {milliseconds: number}> | State<'never-expires'>;

export type ResolvedKind = {
  name: string;
  parsePayload: (value: unknown) => unknown;
  expiresAfter: ExpiryLimit;
  attemptTimeout: AttemptTimeout;
  maxAttempts: number;
  whenExhausted: WhenExhausted;
  laneWhenEnded: LaneSettings;
  attempt: (operation: OperationView, signal: AbortSignal) => Promise<AttemptOutcome>;
  onChanged: (operation: OperationView) => void;
};

export type BackoffLimits = {minimumMilliseconds: number; maximumMilliseconds: number};
export type ResolvedConfiguration = {maxOperations: number; backoff: BackoffLimits};

export type Run = State<'running'> | State<'paused'>;

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_MAX_OPERATIONS = 1_000;
const DEFAULT_BACKOFF_MINIMUM_MILLISECONDS = 5_000;
const DEFAULT_BACKOFF_MAXIMUM_MILLISECONDS = 60_000;
const BACKOFF_GROWTH_FACTOR = 2;

function expiryLimitOf(milliseconds: number | undefined): ExpiryLimit {
  return milliseconds === undefined ? {state: 'never-expires'} : {state: 'expires-after', milliseconds};
}

function attemptTimeoutOf(milliseconds: number | undefined, fallback: AttemptTimeout): AttemptTimeout {
  return milliseconds === undefined ? fallback : {state: 'times-out-after', milliseconds};
}

/** The kind's payloads are the ones its own `parsePayload` returned, so its callbacks may take them as unknown */
export function resolveKind<Payload>(kind: Kind<Payload>): ResolvedKind {
  return {
    name: kind.name,
    parsePayload: kind.parsePayload,
    expiresAfter: expiryLimitOf(kind.expiresAfterMilliseconds),
    attemptTimeout: attemptTimeoutOf(kind.attemptTimeoutMilliseconds, {state: 'never-times-out'}),
    maxAttempts: kind.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    whenExhausted: kind.whenExhausted ?? 'dead-letter',
    laneWhenEnded: {
      'dead-lettered': kind.laneWhenDeadLettered ?? 'continues',
      deleted: kind.laneWhenDeleted ?? 'continues',
    },
    attempt: kind.attempt,
    onChanged: kind.onChanged ?? noop,
  };
}

export function resolveConfiguration(configuration: OutboxConfiguration = {}): ResolvedConfiguration {
  return {
    maxOperations: configuration.maxOperations ?? DEFAULT_MAX_OPERATIONS,
    backoff: {
      minimumMilliseconds: configuration.backoff?.minimumMilliseconds ?? DEFAULT_BACKOFF_MINIMUM_MILLISECONDS,
      maximumMilliseconds: configuration.backoff?.maximumMilliseconds ?? DEFAULT_BACKOFF_MAXIMUM_MILLISECONDS,
    },
  };
}

// State table

/** What the table's rules read: the operation's attempts and its kind's limits */
export type TransitionContext = {attempts: number; maxAttempts: number; whenExhausted: WhenExhausted};

type Rule = OperationState | 'exhausted' | 'retried-or-exhausted';

const STATE_TABLE: Record<OperationState | 'initial', Partial<Record<Trigger, Rule>>> = {
  initial: {'operation-queued': 'queued'},
  queued: {
    'attempt-started': 'in-progress',
    'operation-versioned': 'queued',
    'operation-held': 'on-hold',
    'operation-expired': 'exhausted',
    'operation-dead-lettered': 'dead-lettered',
    'operation-deleted': 'deleted',
    'lane-dead-lettered': 'dead-lettered',
    'lane-deleted': 'deleted',
  },
  'on-hold': {
    'operation-released': 'queued',
    'operation-versioned': 'queued',
    'operation-expired': 'exhausted',
    'operation-dead-lettered': 'dead-lettered',
    'operation-deleted': 'deleted',
    'lane-dead-lettered': 'dead-lettered',
    'lane-deleted': 'deleted',
  },
  'in-progress': {
    'attempt-succeeded': 'succeeded',
    'attempt-failed': 'retried-or-exhausted',
    'attempt-timed-out': 'retried-or-exhausted',
    'attempt-errored': 'retried-or-exhausted',
    'attempt-interrupted': 'retried-or-exhausted',
    'attempt-held': 'on-hold',
    'attempt-dead-lettered': 'dead-lettered',
    'attempt-deleted': 'deleted',
    'operation-dead-lettered': 'dead-lettered',
    'operation-deleted': 'deleted',
  },
  'dead-lettered': {'operation-versioned': 'queued', 'operation-deleted': 'deleted'},
  succeeded: {},
  deleted: {},
};

const EXHAUSTED_AS: Record<WhenExhausted, EndedState> = {'dead-letter': 'dead-lettered', delete: 'deleted'};

export function resolveTarget(
  from: OperationState | 'initial',
  trigger: Trigger,
  context: TransitionContext,
): Outcome<'target-resolved', {target: OperationState}> | Outcome<'target-refused'> {
  const rule = STATE_TABLE[from][trigger];
  if (rule === undefined) {
    return {outcome: 'target-refused'};
  }
  const target = match(rule)
    .with('exhausted', () => {
      return EXHAUSTED_AS[context.whenExhausted];
    })
    .with('retried-or-exhausted', () => {
      return context.attempts < context.maxAttempts ? 'queued' : EXHAUSTED_AS[context.whenExhausted];
    })
    .otherwise(state => {
      return state;
    });
  return {outcome: 'target-resolved', target};
}

export const isFinal = isInState('succeeded', 'deleted');

// Lane follows

const LANE_TRIGGER_FOR = {'dead-lettered': 'lane-dead-lettered', deleted: 'lane-deleted'} as const;

/**
 * Decides, as an operation is dead-lettered or deleted, whether the operations of its kind behind it end the same
 * way: as `laneWhenEnded` says for that ending, whoever ended it. Never for the cascade's own lane-* triggers, and
 * never from an operation already dead-lettered, which no longer blocks its lane.
 */
export function decideCascade(
  from: OperationState | 'initial',
  trigger: Trigger,
  target: OperationState,
  laneWhenEnded: LaneSettings,
): Cascade {
  if (target !== 'dead-lettered' && target !== 'deleted') {
    return {state: 'none'};
  }
  const isLaneTrigger = trigger === 'lane-dead-lettered' || trigger === 'lane-deleted';
  const follows = laneWhenEnded[target] === 'follows' && from !== 'dead-lettered' && !isLaneTrigger;
  return follows ? {state: 'pending', trigger: LANE_TRIGGER_FOR[target]} : {state: 'none'};
}

/** Whether the operations behind it, stored with its ending, are still to be ended */
export function isCascadePending<Operation extends OperationData>(
  operation: Operation,
): operation is Operation & {cascade: Extract<Cascade, State<'pending'>>} {
  return isInState('pending')(operation.cascade);
}

// Operation data

const VIEW_KEYS = ['state', 'id', 'kind', 'payload', 'correlation', 'lane', 'queuedAt', 'attempts'] as const;

/** What the kernel hands out of an operation: never what only the kernel reads */
export function toView(operation: OperationView): OperationView {
  const view = Object.fromEntries(
    VIEW_KEYS.map(key => {
      return [key, operation[key]];
    }),
  ) as OperationView;
  return Object.freeze(view);
}

function expiryFrom(limit: ExpiryLimit, serverTime: number): Expiry {
  return isInState('expires-after')(limit)
    ? {state: 'expires-at', serverTime: serverTime + limit.milliseconds}
    : {state: 'never-expires'};
}

function requestedExpiryLimit(request: EnqueueRequest<unknown>, kind: ResolvedKind): ExpiryLimit {
  return request.expiresAfterMilliseconds === undefined
    ? kind.expiresAfter
    : expiryLimitOf(request.expiresAfterMilliseconds);
}

export function correlationOf(request: EnqueueRequest<unknown>): Correlation {
  return request.correlationKey === undefined
    ? {state: 'uncorrelated'}
    : {state: 'correlated', correlationKey: request.correlationKey};
}

function laneOf(request: EnqueueRequest<unknown>, fallback: LaneMembership): LaneMembership {
  return request.laneKey === undefined ? fallback : {state: 'in-lane', laneKey: request.laneKey};
}

const isInLane = isInState('in-lane');

function isSameLane(first: LaneMembership, second: LaneMembership): boolean {
  if (isInLane(first) && isInLane(second)) {
    return first.laneKey === second.laneKey;
  }
  return isInState('no-lane')(first) && isInState('no-lane')(second);
}

/** A new operation: the limits of the request override the kind's, for this operation only */
export function newOperationData(
  kind: ResolvedKind,
  request: EnqueueRequest<unknown>,
  payload: unknown,
  place: {id: string; queuedSeq: number; serverTime: number},
): OperationData {
  return {
    state: 'queued',
    id: place.id,
    kind: kind.name,
    payload,
    correlation: correlationOf(request),
    lane: laneOf(request, {state: 'no-lane'}),
    queuedAt: place.serverTime,
    attempts: 0,
    queuedSeq: place.queuedSeq,
    expiry: expiryFrom(requestedExpiryLimit(request, kind), place.serverTime),
    limits: {attemptTimeout: attemptTimeoutOf(request.attemptTimeoutMilliseconds, kind.attemptTimeout)},
    cascade: {state: 'none'},
  };
}

/**
 * A version: replaces the payload and whatever the request passes, keeps the rest, and starts the attempts again.
 * Another lane key moves it to the end of the new lane; the same key, or none, keeps its place.
 * The expiry starts again from now when the request passes one, and for a dead-lettered operation, which gets the
 * request's or else the kind's (never the earlier enqueue's).
 */
export function versionOperationData(
  found: OperationData,
  kind: ResolvedKind,
  request: EnqueueRequest<unknown>,
  payload: unknown,
  place: {queuedSeq: number; serverTime: number},
): OperationData {
  const lane = laneOf(request, found.lane);
  const restartsExpiry = request.expiresAfterMilliseconds !== undefined || isInState('dead-lettered')(found);
  return {
    ...found,
    payload,
    lane,
    queuedSeq: isSameLane(found.lane, lane) ? found.queuedSeq : place.queuedSeq,
    attempts: 0,
    expiry: restartsExpiry ? expiryFrom(requestedExpiryLimit(request, kind), place.serverTime) : found.expiry,
    limits: {attemptTimeout: attemptTimeoutOf(request.attemptTimeoutMilliseconds, found.limits.attemptTimeout)},
  };
}

/** A stored snapshot is usable when its schema and kind are known, its operation hasn't ended and its payload parses */
export function parseStoredSnapshot(
  snapshot: OperationSnapshot,
  kinds: ReadonlyMap<string, ResolvedKind>,
):
  | Outcome<'snapshot-usable', {snapshot: OperationSnapshot}>
  | Outcome<
      'snapshot-unusable',
      {reason: 'schema-unknown' | 'kind-not-registered' | 'operation-ended' | 'payload-invalid'}
    > {
  const kind = kinds.get(snapshot.kind);
  if (snapshot.schemaVersion !== SCHEMA_VERSION) {
    return {outcome: 'snapshot-unusable', reason: 'schema-unknown'};
  }
  if (kind === undefined) {
    return {outcome: 'snapshot-unusable', reason: 'kind-not-registered'};
  }
  if (isFinal(snapshot) && !isCascadePending(snapshot)) {
    return {outcome: 'snapshot-unusable', reason: 'operation-ended'};
  }
  try {
    return {
      outcome: 'snapshot-usable',
      snapshot: Object.freeze({...snapshot, payload: kind.parsePayload(snapshot.payload)}),
    };
  } catch {
    return {outcome: 'snapshot-unusable', reason: 'payload-invalid'};
  }
}

/** Lane order only matters among the operations that exist, so the next place follows the last one */
export function nextQueuedSeqOf(operations: Iterable<OperationData>): number {
  return (
    [...operations].reduce((highest, {queuedSeq}) => {
      return Math.max(highest, queuedSeq);
    }, 0) + 1
  );
}

// Lanes

const isLaned = (operation: OperationSnapshot): operation is OperationSnapshot & {lane: State<'in-lane'>} => {
  return isInLane(operation.lane);
};

const byQueuedSeq = (earlier: OperationData, later: OperationData): number => {
  return earlier.queuedSeq - later.queuedSeq;
};

const LANE_STATE: Record<OperationState, Lane['state']> = {
  queued: 'moving',
  'on-hold': 'blocked',
  'in-progress': 'moving',
  'dead-lettered': 'moving',
  succeeded: 'moving',
  deleted: 'moving',
};

/**
 * An operation that is dead-lettered doesn't block its lane, so it isn't in one. One that is still ending the
 * operations behind it, dead-lettered or deleted, blocks it until they have ended.
 */
function operationsByLane(operations: Iterable<OperationSnapshot>): Map<string, OperationSnapshot[]> {
  const laned = [...operations]
    .filter(isLaned)
    .filter(operation => {
      return !isInState('dead-lettered')(operation) || isCascadePending(operation);
    })
    .toSorted(byQueuedSeq);
  return Map.groupBy(laned, operation => {
    return operation.lane.laneKey;
  });
}

export function lanesOf(operations: Iterable<OperationSnapshot>): Map<string, Lane> {
  return new Map(
    [...operationsByLane(operations)].map(([laneKey, inLane]): [string, Lane] => {
      return [laneKey, {state: LANE_STATE[inLane[0].state], laneKey, operations: inLane.map(toView)}];
    }),
  );
}

/**
 * The operations an ending reaches when its lane follows it: those of the same kind behind it in its lane,
 * queued or on hold, in lane order. Operations of other kinds, in other lanes or without one, are not reached.
 */
export function findOperationFollowers(operations: Iterable<OperationSnapshot>) {
  return (ended: OperationData): OperationSnapshot[] => {
    const isWaiting = isInState('queued', 'on-hold');
    return [...operations]
      .filter(operation => {
        return (
          isWaiting(operation) &&
          operation.kind === ended.kind &&
          operation.queuedSeq > ended.queuedSeq &&
          isInLane(ended.lane) &&
          isSameLane(operation.lane, ended.lane)
        );
      })
      .toSorted(byQueuedSeq);
  };
}

// Pass plan

export type Wake = State<'wake-in', {milliseconds: number}> | State<'no-wake'>;
export type PassPlan = {expire: string[]; start: string[]; wake: Wake};

export type PassSituation = {
  operations: readonly OperationSnapshot[];
  serverTime: number;
  run: Run;
  backoffRemainingMilliseconds: number;
};

const isExpiring = (
  operation: OperationSnapshot,
): operation is OperationSnapshot & {expiry: State<'expires-at', {serverTime: number}>} => {
  return isInState('queued', 'on-hold')(operation) && isInState('expires-at')(operation.expiry);
};

export function isDueToExpire(operation: OperationSnapshot, serverTime: number): boolean {
  return isExpiring(operation) && operation.expiry.serverTime <= serverTime;
}

/**
 * What to do now and when to look again. A running attempt is never expired; it is given up when it fails.
 * Whatever is due now is handled by the pass itself, so only what falls due later wakes it.
 */
export function planPass({operations, serverTime, run, backoffRemainingMilliseconds}: PassSituation): PassPlan {
  const isRunning = isInState('running')(run);
  const mayStart = isRunning && backoffRemainingMilliseconds === 0;
  const laneHeads = [...operationsByLane(operations).values()].map(inLane => {
    return inLane[0];
  });
  const withoutLane = operations.filter(operation => {
    return isInState('no-lane')(operation.lane);
  });
  const start = mayStart
    ? [...laneHeads, ...withoutLane]
        .filter(isInState('queued'))
        .toSorted(byQueuedSeq)
        .map(({id}) => {
          return id;
        })
    : [];

  const expiryDelays = operations
    .filter(isExpiring)
    .map(({expiry}) => {
      return expiry.serverTime - serverTime;
    })
    .filter(delay => {
      return delay > 0;
    });
  const isWaitingForBackoff = isRunning && backoffRemainingMilliseconds > 0 && operations.some(isInState('queued'));
  const delays = isWaitingForBackoff ? [...expiryDelays, backoffRemainingMilliseconds] : expiryDelays;

  return {
    expire: operations
      .filter(operation => {
        return isDueToExpire(operation, serverTime);
      })
      .map(({id}) => {
        return id;
      }),
    start,
    wake: delays.length === 0 ? {state: 'no-wake'} : {state: 'wake-in', milliseconds: Math.min(...delays)},
  };
}

// Backoff

/**
 * Random between 0 and a cap that doubles from the minimum up to the maximum ("full jitter"), so that clients
 * retrying after the same outage spread out
 */
export function backoffDelay(failures: number, limits: BackoffLimits, random: () => number): number {
  const capMilliseconds = Math.min(
    limits.minimumMilliseconds * BACKOFF_GROWTH_FACTOR ** failures,
    limits.maximumMilliseconds,
  );
  return Math.floor(random() * capMilliseconds);
}
