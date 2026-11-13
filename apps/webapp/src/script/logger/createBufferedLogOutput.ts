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

import type {Clock, TimeoutIdentifier} from '@enormora/clock/clock';
import {createFireAndForgetInvoker} from '@enormora/fire-and-forget';
import {isUndefined} from '@sindresorhus/is';

import type {LogOutput} from './logOutput';
import type {LogPersistenceConfiguration} from './logPersistenceConfiguration';

type BufferedLogOutputOptions = {
  readonly append: (lines: readonly string[]) => Promise<void>;
  readonly clock: Pick<Clock, 'setTimeout' | 'clearTimeout'>;
  readonly configuration: LogPersistenceConfiguration;
};

type PendingRecord = {readonly line: string; readonly sizeBytes: number};

export type LogPersistenceStatistics = {
  readonly droppedRecords: number;
  readonly failures: number;
  readonly pendingBytes: number;
  readonly suspended: boolean;
};

export type BufferedLogOutput = {
  readonly write: LogOutput;
  readonly flush: () => Promise<void>;
  readonly dispose: () => Promise<void>;
  readonly getStatistics: () => LogPersistenceStatistics;
};

export function createBufferedLogOutput(options: BufferedLogOutputOptions): BufferedLogOutput {
  const {append, clock, configuration} = options;
  const encoder = new TextEncoder();
  const maximumRecordBytes = Math.min(
    configuration.maximumFileBytes,
    configuration.maximumTotalBytes,
    configuration.maximumPendingBytes,
  );
  let pending: PendingRecord[] = [];
  let pendingBytes = 0;
  // Sent records still consume the payload budget until acknowledged; this is not an exact heap limit.
  let inFlightBytes = 0;
  let droppedRecords = 0;
  let failures = 0;
  let suspended = false;
  let disposed = false;
  let timer: TimeoutIdentifier | undefined;
  let draining: Promise<void> | undefined;
  let flushRequested = false;
  const fireAndForgetInvoker = createFireAndForgetInvoker({
    reportError() {
      failures += 1;
      suspended = true;
      droppedRecords += pending.length;
      pending = [];
      pendingBytes = 0;
    },
  });

  function isBufferableLogLine(line: string): boolean {
    return line.length < maximumRecordBytes && !line.includes('\n') && !line.includes('\r');
  }

  function wouldExceedPendingByteLimit(recordSizeBytes: number): boolean {
    return pendingBytes + inFlightBytes + recordSizeBytes > configuration.maximumPendingBytes;
  }

  function shouldScheduleFlush(): boolean {
    return isUndefined(timer) && isUndefined(draining);
  }

  function scheduleFlush(): void {
    if (pending.length > 0 && shouldScheduleFlush()) {
      if (pendingBytes >= configuration.batchTargetBytes) {
        fireAndForgetInvoker.fireAndForget(() => {
          return startDrain(false);
        });
      } else {
        timer = clock.setTimeout(() => {
          fireAndForgetInvoker.fireAndForget(() => {
            return startDrain(false);
          });
        }, configuration.flushIntervalMilliseconds);
      }
    }
  }

  function clearTimer(): void {
    if (!isUndefined(timer)) {
      clock.clearTimeout(timer);
      timer = undefined;
    }
  }

  async function drain(): Promise<void> {
    try {
      // An empty batch performs initialization/retention without creating an empty log file.
      do {
        const batch: PendingRecord[] = [];
        const maximumBatchBytes = Math.min(configuration.maximumFileBytes, configuration.maximumTotalBytes);
        for (const record of pending) {
          if (inFlightBytes + record.sizeBytes > maximumBatchBytes) {
            break;
          }

          batch.push(record);
          inFlightBytes += record.sizeBytes;
        }
        pending = pending.slice(batch.length);
        pendingBytes -= inFlightBytes;
        try {
          await append(
            batch.map(record => {
              return record.line;
            }),
          );
        } catch {
          failures += 1;
          suspended = true;
          droppedRecords += batch.length + pending.length;
          pending = [];
          pendingBytes = 0;
        } finally {
          inFlightBytes = 0;
        }
      } while (pending.length > 0 && !suspended && flushRequested);
    } finally {
      draining = undefined;
      flushRequested = false;
      if (!suspended && !disposed) {
        scheduleFlush();
      }
    }
  }

  function startDrain(flushAllRecords: boolean): Promise<void> {
    clearTimer();
    flushRequested = flushRequested || flushAllRecords;
    if (isUndefined(draining)) {
      draining = drain();
    }

    return draining;
  }

  function write(line: string): void {
    if (disposed || suspended) {
      droppedRecords += 1;

      return;
    }

    // The only input is the mandatory sanitized JSON boundary. Do not parse or serialize it here.
    if (!isBufferableLogLine(line)) {
      droppedRecords += 1;

      return;
    }

    const terminatedLine = `${line}\n`;
    const sizeBytes = encoder.encode(terminatedLine).byteLength;
    if (sizeBytes > maximumRecordBytes) {
      droppedRecords += 1;

      return;
    }

    while (wouldExceedPendingByteLimit(sizeBytes) && pending.length > 0) {
      const removed = pending.shift();
      if (!isUndefined(removed)) {
        pendingBytes -= removed.sizeBytes;
        droppedRecords += 1;
      }
    }
    if (wouldExceedPendingByteLimit(sizeBytes)) {
      // In-flight records cannot be recalled; drop the incoming record instead.
      droppedRecords += 1;

      return;
    }

    pending.push({line: terminatedLine, sizeBytes});
    pendingBytes += sizeBytes;
    if (pendingBytes >= configuration.batchTargetBytes) {
      clearTimer();
    }

    scheduleFlush();
  }

  async function flush(): Promise<void> {
    // Explicit calls provide one recovery opportunity; failures never start a retry loop.
    suspended = false;
    await startDrain(true);
  }

  async function dispose(): Promise<void> {
    disposed = true;
    clearTimer();
    await flush();
  }

  function getStatistics(): LogPersistenceStatistics {
    return {droppedRecords, failures, pendingBytes: pendingBytes + inFlightBytes, suspended};
  }

  return {write, flush, dispose, getStatistics};
}
