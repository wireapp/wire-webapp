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
    const target = new EventTarget();
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
    const error = new TypeError('synthetic-secret-message');
    error.stack = 'TypeError: synthetic-secret-message\n at run (https://example.com/app.js:4:17)';
    const errorEvent = Object.assign(new Event('error', {cancelable: true}), {error, lineno: 4, colno: 17});
    const rejection = Object.assign(new Event('unhandledrejection', {cancelable: true}), {
      reason: {privateValue: 'synthetic-secret-rejection'},
    });
    const quotaRejection = Object.assign(new Event('unhandledrejection', {cancelable: true}), {
      reason: new DOMException('synthetic-secret-quota-message', 'QuotaExceededError'),
    });
    const customRejection = Object.assign(new Event('unhandledrejection', {cancelable: true}), {
      reason: new DOMException('synthetic-secret-message', 'synthetic-secret-name'),
    });
    const expectedCancellation = Object.assign(new Event('unhandledrejection'), {
      reason: {type: ConversationError.TYPE.LEGAL_HOLD_CONVERSATION_CANCELLATION},
    });

    target.dispatchEvent(new Event('error'));
    expect(target.dispatchEvent(errorEvent)).toBe(true);
    expect(target.dispatchEvent(rejection)).toBe(true);
    expect(target.dispatchEvent(quotaRejection)).toBe(true);
    expect(target.dispatchEvent(customRejection)).toBe(true);
    target.dispatchEvent(expectedCancellation);
    unsubscribe();
    target.dispatchEvent(errorEvent);
    target.dispatchEvent(rejection);

    expect(lines.join('\n')).not.toContain('synthetic-secret');
    expect(
      lines.map(line => {
        return JSON.parse(line);
      }),
    ).toMatchObject([
      {
        level: 50,
        msg: 'Uncaught JavaScript error',
        errorName: 'TypeError',
        stackLocations: ['app.js:4:17'],
        line: 4,
        column: 17,
      },
      {level: 50, msg: 'Unhandled promise rejection', reasonType: 'object'},
      {level: 50, msg: 'Unhandled promise rejection', errorName: 'QuotaExceededError'},
      {level: 50, msg: 'Unhandled promise rejection', errorName: 'DOMException'},
    ]);
  });

  it('contains logging failures and skips reentrant reporting', () => {
    const target = new EventTarget();
    const event = Object.assign(new Event('error'), {error: new Error()});
    const error = jest.fn(() => {
      target.dispatchEvent(Object.assign(new Event('error'), {error: new Error()}));
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
