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

import {isArray, isPlainObject, isSafeInteger, isString} from '@sindresorhus/is';
import {Maybe} from 'true-myth';

export type LogWorkerCommand =
  {readonly type: 'initialize' | 'flush' | 'shutdown'} | {readonly type: 'append'; readonly lines: readonly string[]};

export type LogWorkerRequest = LogWorkerCommand & {readonly requestIdentifier: number};
export type LogWorkerResponse = {
  readonly requestIdentifier: number;
  readonly outcome: 'complete' | 'failed' | 'unsupported';
};

function isControlCommand(value: unknown): value is 'initialize' | 'flush' | 'shutdown' {
  return value === 'initialize' || value === 'flush' || value === 'shutdown';
}

function isRequestIdentifier(value: unknown): value is number {
  return isSafeInteger(value) && value > 0;
}

function isTerminatedLogLine(line: string): boolean {
  return line.endsWith('\n') && !line.slice(0, -1).includes('\n') && !line.includes('\r');
}

function isBoundedLogBatch(value: unknown, maximumBatchBytes: number): value is string[] {
  return isArray(value) && value.length <= maximumBatchBytes && value.every(isString);
}

function isBoundedTerminatedLogLine(line: string, maximumBatchBytes: number): boolean {
  return line.length <= maximumBatchBytes && isTerminatedLogLine(line);
}

function parseBatch(value: unknown, maximumBatchBytes: number): Maybe<readonly string[]> {
  if (!isBoundedLogBatch(value, maximumBatchBytes)) {
    return Maybe.nothing();
  }

  let totalBytes = 0;
  const encoder = new TextEncoder();
  for (const line of value) {
    if (!isBoundedTerminatedLogLine(line, maximumBatchBytes)) {
      return Maybe.nothing();
    }

    totalBytes += encoder.encode(line).byteLength;
    if (totalBytes > maximumBatchBytes) {
      return Maybe.nothing();
    }
  }

  return Maybe.just(value);
}

export function parseLogWorkerRequest(value: unknown, maximumBatchBytes: number): Maybe<LogWorkerRequest> {
  if (!isPlainObject(value) || !isRequestIdentifier(value['requestIdentifier'])) {
    return Maybe.nothing();
  }

  const requestIdentifier = value['requestIdentifier'];
  const commandType = value['type'];
  if (isControlCommand(commandType)) {
    return Maybe.just({type: commandType, requestIdentifier});
  }

  if (commandType === 'append') {
    return parseBatch(value['lines'], maximumBatchBytes).map(lines => {
      return {type: 'append' as const, requestIdentifier, lines};
    });
  }

  return Maybe.nothing();
}

export function parseLogWorkerResponse(value: unknown): Maybe<LogWorkerResponse> {
  if (!isPlainObject(value) || !isRequestIdentifier(value['requestIdentifier'])) {
    return Maybe.nothing();
  }

  const outcome = value['outcome'];
  if (outcome !== 'complete' && outcome !== 'failed' && outcome !== 'unsupported') {
    return Maybe.nothing();
  }

  return Maybe.just({requestIdentifier: value['requestIdentifier'], outcome});
}
