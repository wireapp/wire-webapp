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

import {isError, isInteger} from '@sindresorhus/is';

import type {LogAttributes, Logger} from './logger';

type RuntimeErrorEventType = 'error' | 'unhandledrejection';

type RuntimeErrorDiagnosticsOptions = {
  readonly subscribe: <Type extends RuntimeErrorEventType>(
    type: Type,
    listener: (event: WindowEventMap[Type]) => void,
  ) => () => void;
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
const diagnosticDomExceptionNames: ReadonlySet<string> = new Set([
  'AbortError',
  'DataCloneError',
  'InvalidStateError',
  'NetworkError',
  'NotAllowedError',
  'NotFoundError',
  'NotSupportedError',
  'OperationError',
  'QuotaExceededError',
  'SecurityError',
  'TimeoutError',
]);

function getErrorAttributes(reason: unknown): LogAttributes {
  if (reason instanceof DOMException) {
    const name = reason.name;

    return {errorName: diagnosticDomExceptionNames.has(name) ? name : 'DOMException'};
  }

  if (!isError(reason)) {
    return {reasonType: reason === null ? 'null' : typeof reason};
  }

  // Runtime errors can contain arbitrary user data in their message, stack, or custom properties.
  const errorName = reason.name;

  return {errorName: standardErrorNames.has(errorName) ? errorName : 'Error'};
}

export function registerRuntimeErrorDiagnostics(options: RuntimeErrorDiagnosticsOptions): () => void {
  const {subscribe, logger, isExpectedRejection} = options;
  let reporting = false;

  function report(message: string, attributes: () => LogAttributes | undefined): void {
    if (reporting) {
      return;
    }

    reporting = true;
    try {
      const logAttributes = attributes();

      if (logAttributes !== undefined) {
        logger.error(message, logAttributes);
      }
    } catch {
      // Reporting must never trigger another uncaught error.
    } finally {
      reporting = false;
    }
  }

  const unsubscribeError = subscribe('error', event => {
    // Element resource failures also use an error event. Report only JavaScript error events.
    if (event instanceof ErrorEvent) {
      report('Uncaught JavaScript error', () => {
        const error = event.error;
        const line = event.lineno;
        const column = event.colno;

        return {
          ...getErrorAttributes(error),
          line: isInteger(line) ? line : undefined,
          column: isInteger(column) ? column : undefined,
        };
      });
    }
  });
  const unsubscribeRejection = subscribe('unhandledrejection', event => {
    report('Unhandled promise rejection', () => {
      const reason = event.reason;

      if (isExpectedRejection(reason)) {
        return undefined;
      }

      return getErrorAttributes(reason);
    });
  });

  return function unsubscribe(): void {
    unsubscribeError();
    unsubscribeRejection();
  };
}
