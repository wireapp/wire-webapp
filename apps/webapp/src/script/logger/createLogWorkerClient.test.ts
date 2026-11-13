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

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';

import {createBufferedLogOutput} from './createBufferedLogOutput';
import {createLogWorkerClient} from './createLogWorkerClient';
import {logPersistenceConfiguration} from './logPersistenceConfiguration';
import {createLogWorkerConnectionForTest} from './test/createLogWorkerConnectionForTest';

function createTestClock(): ReturnType<typeof createDeterministicClock> {
  return createDeterministicClock({initialUnixEpochMicroseconds: 0n});
}

describe('bounded log worker client', () => {
  it('initializes before forwarding ordered sanitized lines and supports explicit flush and shutdown', async () => {
    const worker = createLogWorkerConnectionForTest();
    const client = createLogWorkerClient({
      connection: worker.connection,
      clock: createTestClock(),
      responseTimeoutMilliseconds: 1000,
    });
    worker.state.onPost = function respond(request) {
      worker.emitMessage({requestIdentifier: request.requestIdentifier, outcome: 'complete'});
    };
    const lines = ['{"escaped":"\\u0025","unicode":"€"}\n', '{"second":true}\n'];
    await client.append(lines);
    await client.append([]);
    await client.shutdown();

    expect(worker.requests).toEqual([
      {type: 'initialize', requestIdentifier: 1},
      {type: 'append', requestIdentifier: 2, lines},
      {type: 'flush', requestIdentifier: 3},
      {type: 'shutdown', requestIdentifier: 4},
    ]);
    expect(worker.state.terminated).toBe(true);
  });

  it('bounds pending and unacknowledged bytes when initialization or writes are slow', async () => {
    const worker = createLogWorkerConnectionForTest();
    const clock = createTestClock();
    const client = createLogWorkerClient({connection: worker.connection, clock, responseTimeoutMilliseconds: 1000});
    const output = createBufferedLogOutput({
      clock,
      append: client.append,
      configuration: {...logPersistenceConfiguration, maximumPendingBytes: 12},
    });
    output.write('{}', 'info');
    const flushing = output.flush();
    for (let recordIndex = 0; recordIndex < 1000; recordIndex += 1) {
      output.write('[]', 'info');
    }
    expect(worker.requests).toEqual([{type: 'initialize', requestIdentifier: 1}]);
    expect(output.getStatistics()).toMatchObject({pendingBytes: 12, droppedRecords: 997});
    worker.emitMessage({requestIdentifier: 1, outcome: 'complete'});
    await Promise.resolve();
    expect(worker.requests).toHaveLength(2);
    worker.emitMessage({requestIdentifier: 2, outcome: 'complete'});
    await Promise.resolve();
    await Promise.resolve();
    expect(worker.requests).toHaveLength(3);
    worker.emitMessage({requestIdentifier: 3, outcome: 'complete'});
    await flushing;

    expect(worker.requests.at(2)).toEqual({type: 'append', requestIdentifier: 3, lines: ['[]\n', '[]\n', '[]\n']});
    expect(output.getStatistics().pendingBytes).toBe(0);
  });

  it.each(['timeout', 'crash', 'post-error', 'wrong-response'] as const)(
    'settles and disables a %s worker without retaining an unbounded queue',
    async failure => {
      const worker = createLogWorkerConnectionForTest();
      const clock = createTestClock();
      const client = createLogWorkerClient({connection: worker.connection, clock, responseTimeoutMilliseconds: 1000});
      worker.state.failPosting = failure === 'post-error';
      const writing = client.append(['{}\n']);
      const rejected = expect(writing).rejects.toThrow();
      if (failure === 'timeout') {
        clock.advanceByMilliseconds(1000);
      } else if (failure === 'wrong-response') {
        worker.emitMessage({requestIdentifier: 99, outcome: 'complete'});
      } else if (failure !== 'post-error') {
        worker.fail();
      }

      await rejected;
      expect(worker.state.terminated).toBe(true);
      await expect(client.append(['[]\n'])).rejects.toThrow();
      expect(worker.requests).toHaveLength(failure === 'post-error' ? 0 : 1);
      await client.shutdown();
    },
  );

  it('disables unsupported persistence without retrying the worker', async () => {
    const worker = createLogWorkerConnectionForTest();
    const client = createLogWorkerClient({
      connection: worker.connection,
      clock: createTestClock(),
      responseTimeoutMilliseconds: 1000,
    });
    const writing = client.append([]);
    const rejected = expect(writing).rejects.toThrow();
    worker.emitMessage({requestIdentifier: 1, outcome: 'unsupported'});
    await rejected;
    await expect(client.append([])).rejects.toThrow();

    expect(worker.requests).toHaveLength(1);
    expect(worker.state.terminated).toBe(true);
  });

  it('allows explicit recovery after a storage failure without replaying an uncertain batch', async () => {
    const worker = createLogWorkerConnectionForTest();
    const client = createLogWorkerClient({
      connection: worker.connection,
      clock: createTestClock(),
      responseTimeoutMilliseconds: 1000,
    });
    worker.state.onPost = function respond(request) {
      worker.emitMessage({
        requestIdentifier: request.requestIdentifier,
        outcome: request.type === 'append' ? 'failed' : 'complete',
      });
    };
    await expect(client.append(['{}\n'])).rejects.toThrow();
    await client.append([]);
    expect(worker.state.terminated).toBe(false);
    await client.shutdown();

    expect(
      worker.requests.map(request => {
        return request.type;
      }),
    ).toEqual(['initialize', 'append', 'flush', 'shutdown']);
  });
});
