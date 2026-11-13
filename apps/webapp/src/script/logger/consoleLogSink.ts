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

import type {Logger} from './logger';
import {serializeLogRecord} from './serializeLogRecord';
import type {LogRecord, LogSink} from './structuredLogger';

export type ConsoleLogOutput = Readonly<Record<keyof Logger, (...values: unknown[]) => void>>;

type ConsoleLogSinkOptions = {
  readonly output: ConsoleLogOutput;
};

export function createConsoleLogSink(options: ConsoleLogSinkOptions): LogSink {
  const {output} = options;

  function writeConsoleRecord(record: LogRecord): void {
    try {
      output[record.level](serializeLogRecord(record));
    } catch {
      // Console failures must not escape into application logic or recursively report themselves.
    }
  }

  return writeConsoleRecord;
}
