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

import {toView} from './operationData';
import type {Lane, OperationSnapshot} from './types';

/** The operations of an ordering key that may still go out: the first, and those that wait behind it */
export type LaneQueue = {orderingKey: string; first: OperationSnapshot; behind: OperationSnapshot[]};

type OrderedOperation = OperationSnapshot & {orderingKey: string};

function isOrderedAndNotDeadLettered(operation: OperationSnapshot): operation is OrderedOperation {
  return operation.orderingKey !== undefined && operation.state !== 'dead-lettered';
}

/** The lane queues by ordering key; an operation that is dead-lettered doesn't block its lane, so it isn't in one */
export function laneQueuesOf(operations: Iterable<OperationSnapshot>): Map<string, LaneQueue> {
  const queues = new Map<string, LaneQueue>();
  const inQueueOrder = [...operations].filter(isOrderedAndNotDeadLettered).toSorted((earlier, later) => {
    return earlier.queuedSeq - later.queuedSeq;
  });
  for (const operation of inQueueOrder) {
    const queue = queues.get(operation.orderingKey);
    if (queue === undefined) {
      queues.set(operation.orderingKey, {orderingKey: operation.orderingKey, first: operation, behind: []});
    } else {
      queue.behind.push(operation);
    }
  }
  return queues;
}

/**
 * The operations a giving up reaches when its kind's lane follows it: those of the same kind behind it in its lane,
 * queued or held, in lane order. Operations of other kinds, in other lanes or without one, are not reached.
 */
export function operationsFollowing(
  operations: Iterable<OperationSnapshot>,
  givenUp: OperationSnapshot,
): OperationSnapshot[] {
  return [...operations]
    .filter(({orderingKey, kind, queuedSeq, state}) => {
      const isWaiting = state === 'queued' || state === 'on-hold';
      return (
        givenUp.orderingKey !== undefined &&
        orderingKey === givenUp.orderingKey &&
        kind === givenUp.kind &&
        queuedSeq > givenUp.queuedSeq &&
        isWaiting
      );
    })
    .toSorted((earlier, later) => {
      return earlier.queuedSeq - later.queuedSeq;
    });
}

/** A lane is blocked while its first operation is on hold */
export function toLane({orderingKey, first, behind}: LaneQueue): Lane {
  return {
    orderingKey,
    status: first.state === 'on-hold' ? 'blocked' : 'moving',
    first: toView(first),
    size: behind.length,
  };
}
