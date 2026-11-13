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
import {logPersistenceConfiguration} from './logPersistenceConfiguration';

function createTestClock(): ReturnType<typeof createDeterministicClock> {
  return createDeterministicClock({initialUnixEpochMicroseconds: 0n});
}

describe('buffered log output', () => {
  it('sends full batches early and coalesces records arriving during an automatic write', async () => {
    const clock = createTestClock();
    const firstWrite = Promise.withResolvers<void>();
    const batches: (readonly string[])[] = [];
    async function append(lines: readonly string[]): Promise<void> {
      batches.push(lines);
      if (batches.length === 1) {
        await firstWrite.promise;
      }
    }
    const output = createBufferedLogOutput({
      clock,
      append,
      configuration: {...logPersistenceConfiguration, batchTargetBytes: 6},
    });
    output.write('{}', 'info');
    expect(batches).toEqual([]);
    output.write('{}', 'info');
    expect(batches).toEqual([['{}\n', '{}\n']]);
    output.write('[]', 'info');
    firstWrite.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(batches).toHaveLength(1);
    clock.advanceByMilliseconds(logPersistenceConfiguration.flushIntervalMilliseconds);
    await output.flush();

    expect(batches).toEqual([['{}\n', '{}\n'], ['[]\n']]);
  });

  it('batches ordered, unchanged sanitized records and flushes on the clock', async () => {
    const clock = createTestClock();
    const append = jest.fn<Promise<void>, [readonly string[]]>();
    const output = createBufferedLogOutput({clock, append, configuration: logPersistenceConfiguration});
    const firstLine = '{"msg":"Bearer [REDACTED]","escaped":"\\u0025","unicode":"€"}';
    const secondLine = '{"msg":"second\\nline"}';
    output.write(firstLine, 'info');
    output.write(secondLine, 'warn');
    expect(append).not.toHaveBeenCalled();

    clock.advanceByMilliseconds(logPersistenceConfiguration.flushIntervalMilliseconds);
    await output.flush();

    expect(append).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledWith([`${firstLine}\n`, `${secondLine}\n`]);
    expect(output.getStatistics()).toEqual({droppedRecords: 0, failures: 0, pendingBytes: 0, suspended: false});
  });

  it('flushes explicitly and limits each batch to whole records that fit a file', async () => {
    const append = jest.fn<Promise<void>, [readonly string[]]>();
    const output = createBufferedLogOutput({
      clock: createTestClock(),
      append,
      configuration: {...logPersistenceConfiguration, maximumFileBytes: 6},
    });
    output.write('{}', 'debug');
    output.write('{}', 'info');
    output.write('{}', 'error');

    await output.flush();

    expect(append.mock.calls).toEqual([[['{}\n', '{}\n']], [['{}\n']]]);
  });

  it('drops oldest queued records on overflow, counting UTF-8 bytes including newlines', async () => {
    const append = jest.fn<Promise<void>, [readonly string[]]>();
    const output = createBufferedLogOutput({
      clock: createTestClock(),
      append,
      configuration: {...logPersistenceConfiguration, maximumPendingBytes: 10},
    });
    output.write('"€"', 'info');
    output.write('"a"', 'info');
    expect(output.getStatistics().pendingBytes).toBe(10);
    output.write('"b"', 'info');

    await output.flush();

    expect(append).toHaveBeenCalledWith(['"a"\n', '"b"\n']);
    expect(output.getStatistics().droppedRecords).toBe(1);
  });

  it('bounds queued and in-flight payloads together and never overlaps writes', async () => {
    const blockedWrite = Promise.withResolvers<void>();
    const batches: (readonly string[])[] = [];
    async function append(lines: readonly string[]): Promise<void> {
      batches.push(lines);
      await blockedWrite.promise;
    }
    const output = createBufferedLogOutput({
      clock: createTestClock(),
      append,
      configuration: {...logPersistenceConfiguration, maximumPendingBytes: 6},
    });
    output.write('{}', 'info');
    output.write('{}', 'info');
    const firstFlush = output.flush();
    output.write('[]', 'info');
    expect(output.getStatistics().pendingBytes).toBe(6);
    expect(batches).toEqual([['{}\n', '{}\n']]);
    const secondFlush = output.flush();
    blockedWrite.resolve();
    await Promise.all([firstFlush, secondFlush]);

    expect(batches).toEqual([['{}\n', '{}\n']]);
    expect(output.getStatistics().droppedRecords).toBe(1);
  });

  it('drops oversized and multi-line entries without truncating or splitting a record', async () => {
    const append = jest.fn<Promise<void>, [readonly string[]]>();
    const output = createBufferedLogOutput({
      clock: createTestClock(),
      append,
      configuration: {...logPersistenceConfiguration, maximumFileBytes: 6},
    });
    output.write('"long"', 'info');
    output.write('"€€"', 'info');
    output.write('{}\n{}', 'info');
    output.write('{}\r', 'info');
    output.write('{}', 'info');

    await output.flush();

    expect(append).toHaveBeenCalledWith(['{}\n']);
    expect(output.getStatistics().droppedRecords).toBe(4);
  });

  it('suspends automatic writes after failure and recovers only on an explicit flush', async () => {
    const clock = createTestClock();
    let unavailable = true;
    const batches: (readonly string[])[] = [];
    async function append(lines: readonly string[]): Promise<void> {
      if (unavailable) {
        throw Object.assign(new Error('Storage full'), {name: 'QuotaExceededError'});
      }

      batches.push(lines);
    }
    const output = createBufferedLogOutput({clock, append, configuration: logPersistenceConfiguration});
    output.write('{}', 'info');
    await expect(output.flush()).resolves.toBeUndefined();
    output.write('[]', 'info');
    clock.advanceByMilliseconds(60_000);
    expect(output.getStatistics()).toEqual({droppedRecords: 2, failures: 1, pendingBytes: 0, suspended: true});
    unavailable = false;
    await output.flush();
    output.write('{"recovered":true}', 'info');
    await output.flush();

    expect(batches).toEqual([[], ['{"recovered":true}\n']]);
    expect(output.getStatistics().suspended).toBe(false);
  });

  it('initializes without logs, disposes with a final flush and cancels its timer', async () => {
    const clock = createTestClock();
    const append = jest.fn<Promise<void>, [readonly string[]]>();
    const output = createBufferedLogOutput({clock, append, configuration: logPersistenceConfiguration});
    await output.flush();
    expect(append).toHaveBeenCalledWith([]);
    output.write('{}', 'info');
    await output.dispose();
    output.write('[]', 'info');
    clock.advanceByMilliseconds(60_000);

    expect(append.mock.calls).toEqual([[[]], [['{}\n']]]);
    expect(output.getStatistics().droppedRecords).toBe(1);
  });
});
