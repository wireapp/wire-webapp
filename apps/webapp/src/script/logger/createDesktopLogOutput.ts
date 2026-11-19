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

import type {Clock} from '@enormora/clock/clock';
import pTimeout, {type Options as PromiseTimeoutOptions} from 'p-timeout';

import {createBufferedLogOutput, type BufferedLogOutput} from './createBufferedLogOutput';
import type {DesktopApplicationLogWrite} from './selectDesktopApplicationLogWrite';

type DesktopLogWriteResult = 'written' | 'rejected' | 'busy' | 'failed';
type DesktopLogFailure = Exclude<DesktopLogWriteResult, 'written'> | 'timeout';

type DesktopLogOutputOptions = {
  readonly clock: Pick<Clock, 'setTimeout' | 'clearTimeout'>;
  readonly writeToDesktop: DesktopApplicationLogWrite;
  readonly reportFailure: (failure: DesktopLogFailure) => void;
};

// Desktop v1 counts the LF it adds toward both its record and batch limits.
const maximumRecordAndBatchBytes = 262_144;
const maximumBatchRecords = 1024;
const batchTargetBytes = 65_536;
const responseTimeoutMilliseconds = 10_000;

export function createDesktopLogOutput(options: DesktopLogOutputOptions): Pick<BufferedLogOutput, 'write' | 'flush'> {
  const {clock, writeToDesktop, reportFailure} = options;
  const acknowledgementTimeout = {
    milliseconds: responseTimeoutMilliseconds,
    // p-timeout passes the opaque timer handle from setTimeout back to the same clock's clearTimeout.
    customTimers: clock as unknown as NonNullable<PromiseTimeoutOptions<'timeout'>['customTimers']>,
    fallback(): 'timeout' {
      return 'timeout';
    },
  } satisfies PromiseTimeoutOptions<'timeout'>;
  const reportedFailures = new Set<DesktopLogFailure>();
  let writeInProgress = false;

  function reportFailureOnce(failure: DesktopLogFailure): void {
    if (reportedFailures.has(failure)) {
      return;
    }

    reportedFailures.add(failure);
    try {
      reportFailure(failure);
    } catch {
      // Diagnostics about logging failures must also be best-effort.
    }
  }

  async function writeBatch(lines: readonly string[]): Promise<DesktopLogWriteResult> {
    writeInProgress = true;
    try {
      const result = await writeToDesktop(
        lines.map(line => {
          return line.slice(0, -1);
        }),
      );
      switch (result) {
        case 'written':
        case 'rejected':
        case 'busy':
        case 'failed':
          return result;
        default:
          return 'failed';
      }
    } catch {
      return 'failed';
    } finally {
      writeInProgress = false;
    }
  }

  async function append(lines: readonly string[]): Promise<void> {
    if (lines.length === 0) {
      return;
    }
    // The timed-out IPC may still be pending in Electron. It cannot be cancelled.
    if (writeInProgress) {
      return;
    }

    const result = await pTimeout(writeBatch(lines), acknowledgementTimeout);

    if (result === 'written') {
      reportedFailures.clear();

      return;
    }

    // Drop this batch and keep admitting new records. Replaying could duplicate a late write.
    reportFailureOnce(result);
  }

  return createBufferedLogOutput({
    append,
    clock,
    maximumBatchRecords,
    configuration: {
      maximumFileBytes: maximumRecordAndBatchBytes,
      maximumTotalBytes: maximumRecordAndBatchBytes,
      maximumPendingBytes: maximumRecordAndBatchBytes,
      batchTargetBytes,
      flushIntervalMilliseconds: 1000,
    },
  });
}
