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

import {laneQueuesOf} from './lanes';
import type {OperationSnapshot} from './types';

export type SchedulerSituation = {
  operations: readonly OperationSnapshot[];
  /** Server time, which the expiry is measured in */
  serverNow: number;
  /** Whether the outbox may start attempts: resumed, and not paused */
  isRunning: boolean;
  backoffRemainingMilliseconds: number;
  /** The operations that commands are waiting on; they don't start before those are applied */
  operationIdsWithWaitingCommands: ReadonlySet<string>;
  /** Whether the store failed in the pass that just ran, which delays the next one by the backoff */
  afterStoreFailure: boolean;
};

export type SchedulerPlan = {
  /** The queued or held operations whose expiry has been reached */
  expire: string[];
  /** The operations to start, in queue order */
  start: string[];
  /** When to look again, if anything will change by itself: an expiry, or the end of the backoff */
  wakeInMilliseconds: number | undefined;
};

type ExpiringOperation = OperationSnapshot & {validUntil: number};

function isExpiring(operation: OperationSnapshot): operation is ExpiringOperation {
  return (operation.state === 'queued' || operation.state === 'on-hold') && operation.validUntil !== undefined;
}

export function isDueToExpire(operation: OperationSnapshot, serverNow: number): boolean {
  return isExpiring(operation) && operation.validUntil <= serverNow;
}

/** What to do now and when to look again; a running attempt is never expired, it is given up when it fails */
export function planScheduler(situation: SchedulerSituation): SchedulerPlan {
  const {operations, serverNow, isRunning, backoffRemainingMilliseconds, operationIdsWithWaitingCommands} = situation;
  const expiring = operations.filter(isExpiring);

  const mayStart = isRunning && backoffRemainingMilliseconds === 0;
  const heads = [...laneQueuesOf(operations).values()].map(({first}) => {
    return first;
  });
  const withoutLane = operations.filter(({orderingKey}) => {
    return orderingKey === undefined;
  });
  const start = mayStart
    ? [...heads, ...withoutLane]
        .filter(({id, state}) => {
          return state === 'queued' && !operationIdsWithWaitingCommands.has(id);
        })
        .toSorted((earlier, later) => {
          return earlier.queuedSeq - later.queuedSeq;
        })
        .map(({id}) => {
          return id;
        })
    : [];

  const expiryDelays = expiring.map(({validUntil}) => {
    return Math.max(validUntil - serverNow, situation.afterStoreFailure ? backoffRemainingMilliseconds : 0);
  });
  const isWaitingForBackoff =
    isRunning &&
    backoffRemainingMilliseconds > 0 &&
    operations.some(({state}) => {
      return state === 'queued';
    });
  const delays = isWaitingForBackoff ? [...expiryDelays, backoffRemainingMilliseconds] : expiryDelays;

  return {
    expire: operations
      .filter(operation => {
        return isDueToExpire(operation, serverNow);
      })
      .map(({id}) => {
        return id;
      }),
    start,
    wakeInMilliseconds: delays.length === 0 ? undefined : Math.min(...delays),
  };
}
