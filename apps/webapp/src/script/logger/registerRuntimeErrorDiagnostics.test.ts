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
import {Maybe} from 'true-myth';

import {ConversationError} from '../error/conversationError';
import {isLegalHoldCancellation} from '../error/isLegalHoldCancellation';

import {createPinoLogging} from './createPinoLogging';
import type {LogOutput} from './logOutput';
import {registerRuntimeErrorDiagnostics} from './registerRuntimeErrorDiagnostics';

describe('runtime error diagnostics', () => {
  it('persists safe JavaScript and rejection diagnostics and leaves browser handling intact', () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 1000n});
    const lines: string[] = [];
    const logging = createPinoLogging(
      Maybe.just({
        clock,
        persistenceOutput: Maybe.just<LogOutput>(line => {
          lines.push(line);
        }),
        output() {},
        namespaces: Maybe.nothing<string>(),
      }),
    );
    const target: Pick<Window, 'addEventListener' | 'removeEventListener' | 'dispatchEvent'> = new EventTarget();
    const unsubscribe = registerRuntimeErrorDiagnostics({
      subscribe(type, listener) {
        target.addEventListener(type, listener);

        return function unsubscribeListener(): void {
          target.removeEventListener(type, listener);
        };
      },
      logger: logging.getLogger('@wireapp/webapp/RuntimeErrors'),
      isExpectedRejection: isLegalHoldCancellation,
    });
    const multilineMessageFrame = 'synthetic-secret-message-frame.js';
    const error = new TypeError(
      `synthetic-secret-multiline-message\n    at https://example.com/${multilineMessageFrame}:41:59`,
    );
    const errorEvent = new ErrorEvent('error', {cancelable: true, error, lineno: 4, colno: 17});
    let lineNumberReads = 0;
    let columnNumberReads = 0;
    Object.defineProperty(errorEvent, 'lineno', {
      get() {
        lineNumberReads += 1;

        return lineNumberReads === 1 ? 4 : 999;
      },
    });
    Object.defineProperty(errorEvent, 'colno', {
      get() {
        columnNumberReads += 1;

        return columnNumberReads === 1 ? 17 : 999;
      },
    });
    const rejection = Object.assign(new Event('unhandledrejection', {cancelable: true}), {
      reason: {privateValue: 'synthetic-secret-rejection'},
    });
    const mutableStackFrame = 'synthetic-secret-mutable-stack-frame.js';
    const rejectionError = new Error('synthetic-secret-rejection-message');
    rejectionError.stack = `Error: synthetic-secret-rejection-message\n    at https://example.com/${mutableStackFrame}:62:73`;
    let errorNameReads = 0;
    Object.defineProperty(rejectionError, 'name', {
      get() {
        errorNameReads += 1;

        return errorNameReads === 1 ? 'Error' : 'synthetic-secret-error-name';
      },
    });
    const mutableStackRejection = Object.assign(new Event('unhandledrejection', {cancelable: true}), {
      reason: rejectionError,
    });
    const quotaRejection = Object.assign(new Event('unhandledrejection', {cancelable: true}), {
      reason: new DOMException('synthetic-secret-quota-message', 'QuotaExceededError'),
    });
    const customRejection = Object.assign(new Event('unhandledrejection', {cancelable: true}), {
      reason: new DOMException('synthetic-secret-message', 'synthetic-secret-name'),
    });
    const expectedCancellation = Object.assign(new Event('unhandledrejection'), {
      reason: new ConversationError(ConversationError.TYPE.LEGAL_HOLD_CONVERSATION_CANCELLATION, 'Canceled'),
    });
    const inheritedCancellation = Object.assign(new Event('unhandledrejection'), {
      reason: Object.create({type: ConversationError.TYPE.LEGAL_HOLD_CONVERSATION_CANCELLATION}),
    });

    target.dispatchEvent(new Event('error'));
    expect(target.dispatchEvent(errorEvent)).toBe(true);
    expect(lineNumberReads).toBe(1);
    expect(columnNumberReads).toBe(1);
    expect(target.dispatchEvent(rejection)).toBe(true);
    expect(target.dispatchEvent(mutableStackRejection)).toBe(true);
    expect(errorNameReads).toBe(1);
    expect(target.dispatchEvent(quotaRejection)).toBe(true);
    expect(target.dispatchEvent(customRejection)).toBe(true);
    target.dispatchEvent(expectedCancellation);
    target.dispatchEvent(inheritedCancellation);
    unsubscribe();
    target.dispatchEvent(errorEvent);
    target.dispatchEvent(rejection);

    expect(lines.join('\n')).not.toContain('synthetic-secret');
    const actualRecords = lines.map(line => {
      return JSON.parse(line);
    });
    expect(actualRecords).toMatchObject([
      {
        level: 50,
        msg: 'Uncaught JavaScript error',
        errorName: 'TypeError',
        line: 4,
        column: 17,
      },
      {level: 50, msg: 'Unhandled promise rejection', reasonType: 'object'},
      {level: 50, msg: 'Unhandled promise rejection', errorName: 'Error'},
      {level: 50, msg: 'Unhandled promise rejection', errorName: 'QuotaExceededError'},
      {level: 50, msg: 'Unhandled promise rejection', errorName: 'DOMException'},
      {level: 50, msg: 'Unhandled promise rejection', reasonType: 'object'},
    ]);
    expect(actualRecords).not.toEqual(
      expect.arrayContaining([expect.objectContaining({stackLocations: expect.any(Array)})]),
    );
  });

  it('guards event getters against reentrant reports and recovers after a getter throws', () => {
    const target: Pick<Window, 'addEventListener' | 'removeEventListener' | 'dispatchEvent'> = new EventTarget();
    const loggedError = jest.fn();
    const unsubscribe = registerRuntimeErrorDiagnostics({
      subscribe(type, listener) {
        target.addEventListener(type, listener);

        return function unsubscribeListener(): void {
          target.removeEventListener(type, listener);
        };
      },
      logger: {error: loggedError},
      isExpectedRejection() {
        target.dispatchEvent(new ErrorEvent('error', {error: new Error('reentrant cancellation check')}));

        return false;
      },
    });
    const errorEvent = new ErrorEvent('error', {error: new TypeError('safe error'), lineno: 4, colno: 17});
    let lineNumberReads = 0;
    Object.defineProperty(errorEvent, 'lineno', {
      get() {
        lineNumberReads += 1;
        target.dispatchEvent(new ErrorEvent('error', {error: new Error('reentrant line read')}));

        return 4;
      },
    });
    target.dispatchEvent(errorEvent);

    expect(lineNumberReads).toBe(1);
    expect(loggedError).toHaveBeenCalledTimes(1);
    expect(loggedError).toHaveBeenLastCalledWith(
      'Uncaught JavaScript error',
      expect.objectContaining({errorName: 'TypeError', line: 4, column: 17}),
    );

    const rejectionEvent = new Event('unhandledrejection');
    let rejectionReasonReads = 0;
    Object.defineProperty(rejectionEvent, 'reason', {
      get() {
        rejectionReasonReads += 1;
        target.dispatchEvent(new ErrorEvent('error', {error: new Error('reentrant reason read')}));

        return new TypeError('safe rejection');
      },
    });
    target.dispatchEvent(rejectionEvent);

    expect(rejectionReasonReads).toBe(1);
    expect(loggedError).toHaveBeenCalledTimes(2);
    expect(loggedError).toHaveBeenLastCalledWith(
      'Unhandled promise rejection',
      expect.objectContaining({errorName: 'TypeError'}),
    );

    const throwingErrorEvent = new ErrorEvent('error', {error: new Error('unused initial error')});
    let throwingErrorReads = 0;
    Object.defineProperty(throwingErrorEvent, 'error', {
      get() {
        throwingErrorReads += 1;

        throw new Error('synthetic error getter failure');
      },
    });
    target.dispatchEvent(throwingErrorEvent);

    expect(throwingErrorReads).toBe(1);
    expect(loggedError).toHaveBeenCalledTimes(2);

    target.dispatchEvent(new ErrorEvent('error', {error: new TypeError('recovery'), lineno: 8, colno: 9}));

    expect(loggedError).toHaveBeenCalledTimes(3);
    unsubscribe();
  });

  it('contains logging failures and skips reentrant reporting', () => {
    const target: Pick<Window, 'addEventListener' | 'removeEventListener' | 'dispatchEvent'> = new EventTarget();
    const event = new ErrorEvent('error', {error: new Error()});
    const error = jest.fn(() => {
      target.dispatchEvent(new ErrorEvent('error', {error: new Error()}));
      throw new Error('Logging failed');
    });
    const unsubscribe = registerRuntimeErrorDiagnostics({
      subscribe(type, listener) {
        target.addEventListener(type, listener);

        return function unsubscribeListener(): void {
          target.removeEventListener(type, listener);
        };
      },
      logger: {error},
      isExpectedRejection() {
        return false;
      },
    });

    target.dispatchEvent(event);
    target.dispatchEvent(event);
    unsubscribe();

    expect(error).toHaveBeenCalledTimes(2);
  });
});
