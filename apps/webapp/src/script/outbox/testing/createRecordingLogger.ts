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

import type {OutboxLogger} from '../types';

type LogEntry = {level: 'info' | 'warn' | 'error'; message: string; attributes?: Readonly<Record<string, unknown>>};

export type RecordingLogger = OutboxLogger & {
  entries: LogEntry[];
  /** The entries of a message, e.g. a call's name */
  entriesOf: (message: string) => LogEntry[];
};

export function createRecordingLogger(): RecordingLogger {
  const entries: LogEntry[] = [];
  const record = (level: LogEntry['level']) => {
    return (message: string, attributes?: Readonly<Record<string, unknown>>) => {
      entries.push({level, message, attributes});
    };
  };

  return {
    info: record('info'),
    warn: record('warn'),
    error: record('error'),
    entries,
    entriesOf: message => {
      return entries.filter(entry => {
        return entry.message === message;
      });
    },
  };
}
