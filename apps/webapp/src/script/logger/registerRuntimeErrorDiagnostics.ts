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

import {isError, isInteger, isString} from '@sindresorhus/is';

import type {LogAttributes, Logger} from './logger';

type RuntimeErrorEventType = 'error' | 'unhandledrejection';

type RuntimeErrorDiagnosticsOptions = {
  readonly subscribe: (type: RuntimeErrorEventType, listener: (event: Event) => void) => () => void;
  readonly logger: Pick<Logger, 'error'>;
  readonly isExpectedRejection: (reason: unknown) => boolean;
};

const standardErrorNames: ReadonlySet<string> = new Set([
  'Error',
  'EvalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError',
  'AggregateError',
  'AbortError',
  'DOMException',
  'RuntimeError',
]);
const maximumInspectedStackLength = 8192;
const maximumStackFrames = 8;

function getErrorAttributes(reason: unknown): LogAttributes {
  if (!isError(reason)) {
    return {reasonType: reason === null ? 'null' : typeof reason};
  }

  // Runtime errors can contain arbitrary user data in their message or custom properties.
  // Retain only a standard error name and coordinates from stack frames.
  const stack = isString(reason.stack) ? reason.stack.slice(0, maximumInspectedStackLength) : '';
  const stackLocations = stack
    .split('\n')
    .slice(1, maximumStackFrames + 1)
    .flatMap(frame => {
      const location = /\/([a-zA-Z0-9_-]{1,100}\.m?js):([0-9]+):([0-9]+)\)?$/.exec(frame)?.slice(1);

      return location === undefined ? [] : [location.join(':')];
    });

  return {errorName: standardErrorNames.has(reason.name) ? reason.name : 'Error', stackLocations};
}

export function registerRuntimeErrorDiagnostics(options: RuntimeErrorDiagnosticsOptions): () => void {
  const {subscribe, logger, isExpectedRejection} = options;
  let reporting = false;

  function report(message: string, attributes: () => LogAttributes): void {
    if (reporting) {
      return;
    }

    reporting = true;
    try {
      logger.error(message, attributes());
    } catch {
      // Reporting must never trigger another uncaught error.
    } finally {
      reporting = false;
    }
  }

  const unsubscribeError = subscribe('error', event => {
    // Element resource failures also use an error event. Report only JavaScript error events.
    if ('error' in event) {
      report('Uncaught JavaScript error', () => {
        return {
          ...getErrorAttributes(event.error),
          line: 'lineno' in event && isInteger(event.lineno) ? event.lineno : undefined,
          column: 'colno' in event && isInteger(event.colno) ? event.colno : undefined,
        };
      });
    }
  });
  const unsubscribeRejection = subscribe('unhandledrejection', event => {
    try {
      const shouldReport = 'reason' in event && !isExpectedRejection(event.reason);
      if (shouldReport) {
        report('Unhandled promise rejection', () => {
          return getErrorAttributes(event.reason);
        });
      }
    } catch {
      // An inaccessible reason must not turn into another uncaught error.
    }
  });

  return function unsubscribe(): void {
    unsubscribeError();
    unsubscribeRejection();
  };
}
