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

import {isError, isString} from '@sindresorhus/is';
import {errWithCause} from 'pino-std-serializers';
import {configure} from 'safe-stable-stringify';
import {Maybe} from 'true-myth';

import type {Logger} from './logger';
import {redactSensitiveString} from './redactSensitiveString';

export type ConsoleLogOutput = Readonly<Record<keyof Logger, (message: string) => void>>;
export type LogOutput = (line: string, level: keyof Logger) => void;
const stringify = configure({deterministic: false});

function protectLogValue(this: Record<string, unknown>, key: string, value: unknown): unknown {
  // Pino's non-enumerable raw reference identifies serialized errors, including nested causes.
  if (['request', 'config', 'response'].includes(key) && isError(this['raw'])) {
    return '[Omitted request details]';
  }
  if (isError(value)) {
    return errWithCause(value);
  }
  return value;
}

function redactJsonString(encoded: string): string {
  const value: unknown = JSON.parse(encoded);

  return isString(value) ? JSON.stringify(redactSensitiveString(value)) : encoded;
}

export function encodeLogOutput(record: Readonly<Record<string, unknown>>): string {
  let serialized: Maybe<string>;
  try {
    serialized = Maybe.of(stringify(record, protectLogValue));
  } catch {
    serialized = Maybe.of(
      stringify(
        {
          level: record['level'],
          time: record['time'],
          component: record['component'],
          msg: record['msg'],
          serializationError: 'Unable to serialize log attributes',
        },
        protectLogValue,
      ),
    );
  }

  // Desktop's legacy Logdown replacements must not alter JSON. Use the same escaping everywhere.
  return (
    serialized
      .unwrapOr('{"serializationError":"Unable to serialize log record"}')
      // Apply Wire's existing string rules to JSON keys and values without traversing the object graph.
      .replace(/"(?:[^"\\]|\\.)*"/gu, redactJsonString)
      .replaceAll('%', '\\u0025')
      .replaceAll('=', '\\u003d')
      .replaceAll('#', '\\u0023')
      .replaceAll('font-weight:', '\\u0066ont-weight:')
  );
}

export function createConsoleOutput(output: ConsoleLogOutput): LogOutput {
  function write(line: string, level: keyof Logger): void {
    try {
      output[level](line);
    } catch {
      // A broken console must not interrupt application logic.
    }
  }

  return write;
}
