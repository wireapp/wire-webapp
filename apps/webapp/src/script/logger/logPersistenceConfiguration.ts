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

export type LogPersistenceConfiguration = {
  readonly maximumFileBytes: number;
  readonly maximumTotalBytes: number;
  readonly maximumAgeMilliseconds: number;
  readonly maximumPendingBytes: number;
  readonly batchTargetBytes: number;
  readonly flushIntervalMilliseconds: number;
  readonly workerResponseTimeoutMilliseconds: number;
};

// Limits include the UTF-8 newline terminating every record.
export const logPersistenceConfiguration: LogPersistenceConfiguration = {
  maximumFileBytes: 10_485_760,
  maximumTotalBytes: 524_288_000,
  maximumAgeMilliseconds: 604_800_000,
  maximumPendingBytes: 262_144,
  batchTargetBytes: 65_536,
  flushIntervalMilliseconds: 1000,
  workerResponseTimeoutMilliseconds: 10_000,
};

export const logDirectoryName = 'wire-logs-v1';
