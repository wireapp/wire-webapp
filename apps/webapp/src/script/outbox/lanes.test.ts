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

import {laneQueuesOf, operationsFollowing, toLane} from './lanes';
import {createStoredSnapshot} from './testing/createOutboxTestKit';
import type {OperationSnapshot} from './types';

function operation(id: string, queuedSeq: number, overrides: Partial<OperationSnapshot> = {}): OperationSnapshot {
  return createStoredSnapshot({kind: 'kind', id, queuedSeq, orderingKey: 'lane', correlationKey: id, ...overrides});
}

describe('laneQueuesOf', () => {
  it('queues the operations of an ordering key by their place in the lane', () => {
    const queues = laneQueuesOf([operation('c', 3), operation('a', 1), operation('b', 2)]);

    expect(queues.get('lane')?.first.id).toBe('a');
    expect(
      queues.get('lane')?.behind.map(({id}) => {
        return id;
      }),
    ).toEqual(['b', 'c']);
  });

  it('keeps the lanes apart, and leaves out operations without an ordering key and dead-lettered ones', () => {
    const queues = laneQueuesOf([
      operation('a', 1),
      operation('b', 2, {orderingKey: 'other'}),
      operation('c', 3, {orderingKey: undefined}),
      operation('d', 0, {state: 'dead-lettered'}),
    ]);

    expect([...queues.keys()].sort()).toEqual(['lane', 'other']);
    expect(queues.get('lane')?.first.id).toBe('a');
  });

  it('does not change what it is given', () => {
    const operations = [operation('b', 2), operation('a', 1)];

    laneQueuesOf(operations);

    expect(
      operations.map(({id}) => {
        return id;
      }),
    ).toEqual(['b', 'a']);
  });
});

describe('operationsFollowing', () => {
  it('reaches the operations of the same kind behind it in its lane, queued or held, in lane order', () => {
    const givenUp = operation('a', 2, {state: 'dead-lettered'});
    const reached = operationsFollowing(
      [operation('d', 5), operation('c', 4, {state: 'on-hold'}), givenUp, operation('b', 3), operation('before', 1)],
      givenUp,
    );

    expect(
      reached.map(({id}) => {
        return id;
      }),
    ).toEqual(['b', 'c', 'd']);
  });

  it('leaves out other kinds, other lanes, operations without a lane, and those that are not waiting', () => {
    const givenUp = operation('a', 1);
    const reached = operationsFollowing(
      [
        operation('kind', 2, {kind: 'other'}),
        operation('lane', 3, {orderingKey: 'other'}),
        operation('none', 4, {orderingKey: undefined}),
        operation('running', 5, {state: 'in-progress'}),
        operation('dead', 6, {state: 'dead-lettered'}),
        operation('reached', 7),
      ],
      givenUp,
    );

    expect(
      reached.map(({id}) => {
        return id;
      }),
    ).toEqual(['reached']);
  });

  it('reaches nothing behind an operation without an ordering key', () => {
    const givenUp = operation('a', 1, {orderingKey: undefined});

    expect(operationsFollowing([operation('b', 2, {orderingKey: undefined})], givenUp)).toEqual([]);
  });
});

describe('toLane', () => {
  it('counts the operations behind the first, not the first', () => {
    const [queue] = laneQueuesOf([operation('a', 1), operation('b', 2)]).values();

    expect(toLane(queue)).toMatchObject({orderingKey: 'lane', size: 1, first: {id: 'a'}});
  });

  it('is moving, or blocked while its first operation is on hold', () => {
    const [moving] = laneQueuesOf([operation('a', 1)]).values();
    const [blocked] = laneQueuesOf([operation('a', 1, {state: 'on-hold'})]).values();

    expect(toLane(moving).status).toBe('moving');
    expect(toLane(blocked).status).toBe('blocked');
  });
});
