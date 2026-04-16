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

import {createCleanupStack} from './cleanupStack';

describe('createCleanupStack', function () {
  it('runs cleanups in reverse registration order', function () {
    const cleanupStack = createCleanupStack();
    const executionOrder: string[] = [];

    cleanupStack.addCleanup(() => {
      executionOrder.push('first');
    });
    cleanupStack.addCleanup(() => {
      executionOrder.push('second');
    });
    cleanupStack.addCleanup(() => {
      executionOrder.push('third');
    });

    cleanupStack.runAllCleanups();

    expect(executionOrder).toEqual(['third', 'second', 'first']);
  });

  it('is idempotent when run multiple times', function () {
    const cleanupStack = createCleanupStack();
    const cleanup = jest.fn();

    cleanupStack.addCleanup(cleanup);
    cleanupStack.runAllCleanups();
    cleanupStack.runAllCleanups();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('swallows cleanup errors and still runs all cleanups', function () {
    const onCleanupError = jest.fn();
    const cleanupStack = createCleanupStack({onCleanupError});
    const executionOrder: string[] = [];

    cleanupStack.addCleanup(function cleanupFirst(): void {
      executionOrder.push('first');
    });
    cleanupStack.addCleanup(function cleanupSecond(): void {
      executionOrder.push('second');
      throw new Error('cleanup failed');
    });
    cleanupStack.addCleanup(function cleanupThird(): void {
      executionOrder.push('third');
    });

    expect(() => {
      cleanupStack.runAllCleanups();
    }).not.toThrow();

    expect(executionOrder).toEqual(['third', 'second', 'first']);
    expect(onCleanupError).toHaveBeenCalledTimes(1);
    expect(onCleanupError.mock.calls[0][0]).toBeInstanceOf(Error);

    expect(() => {
      cleanupStack.runAllCleanups();
    }).not.toThrow();
  });
});
