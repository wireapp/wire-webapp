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

import type {GuardContext} from './operationStateMachine';
import type {EnqueueRequest, Kind, OperationSnapshot, OperationView} from './types';

export const DEFAULT_MAX_ATTEMPTS = 5;

/** What a snapshot says about the operation itself, as opposed to the transition that stored it */
export type OperationData = Omit<OperationSnapshot, 'schemaVersion' | 'seq' | 'trigger' | 'at' | 'state'>;

export function toView(operation: OperationSnapshot): OperationView<unknown> {
  const {id, kind, payload, correlationKey, queuedAt, state, attempts} = operation;
  return {id, kind, payload, correlationKey, queuedAt, state, attempts};
}

/** What the guards of the state table read: the attempts of the operation and the limits of its kind */
export function guardContextOf(operation: OperationData, kind: Kind<unknown> | undefined): GuardContext {
  return {
    attempts: operation.attempts,
    maxAttempts: kind?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    whenGivenUp: kind?.whenGivenUp ?? 'dead-letter',
  };
}

function validUntilFrom(now: number, expiresAfterMilliseconds: number | undefined): number | undefined {
  return expiresAfterMilliseconds === undefined ? undefined : now + expiresAfterMilliseconds;
}

/** A new operation: the limits of the request override the kind's, for this operation only */
export function newOperationData(
  kind: Kind<unknown>,
  request: EnqueueRequest<unknown>,
  payload: unknown,
  place: {id: string; queuedSeq: number; now: number},
): OperationData {
  return {
    id: place.id,
    kind: kind.name,
    payload,
    correlationKey: request.correlationKey,
    orderingKey: request.orderingKey,
    queuedSeq: place.queuedSeq,
    queuedAt: place.now,
    attempts: 0,
    validUntil: validUntilFrom(place.now, request.expiresAfterMilliseconds ?? kind.expiresAfterMilliseconds),
    expiresAfterMilliseconds: request.expiresAfterMilliseconds,
    performTimeoutMilliseconds: request.performTimeoutMilliseconds,
  };
}

/**
 * A version: replaces the payload and whatever the request passes, keeps the rest, and starts the attempts again.
 * A different ordering key moves it to the end of the new lane (`queuedSeq`); the same key, or none, keeps its place.
 * The expiry starts again from now when the request passes one, and for a dead-lettered operation, which gets the
 * request's or else the kind's (never the earlier enqueue's).
 */
export function versionData(
  found: OperationSnapshot,
  kind: Kind<unknown>,
  request: EnqueueRequest<unknown>,
  payload: unknown,
  place: {queuedSeq: number; now: number},
): OperationData {
  const restartsExpiry = request.expiresAfterMilliseconds !== undefined || found.state === 'dead-lettered';
  const movesToOtherLane = request.orderingKey !== undefined && request.orderingKey !== found.orderingKey;
  return {
    ...found,
    payload,
    orderingKey: request.orderingKey ?? found.orderingKey,
    queuedSeq: movesToOtherLane ? place.queuedSeq : found.queuedSeq,
    attempts: 0,
    validUntil: restartsExpiry
      ? validUntilFrom(place.now, request.expiresAfterMilliseconds ?? kind.expiresAfterMilliseconds)
      : found.validUntil,
    expiresAfterMilliseconds: restartsExpiry ? request.expiresAfterMilliseconds : found.expiresAfterMilliseconds,
    performTimeoutMilliseconds: request.performTimeoutMilliseconds ?? found.performTimeoutMilliseconds,
  };
}
