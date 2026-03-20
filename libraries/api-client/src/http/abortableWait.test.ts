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

import {Maybe} from 'true-myth';

import {AbortableWaitDependencies, createAbortableWait} from './abortableWait';

type AbortableWaitDependenciesForTest = {
  readonly abortableWaitDependencies: AbortableWaitDependencies;
  readonly clearTimeout: jest.Mock<void, [ReturnType<typeof globalThis.setTimeout>]>;
  readonly invokeScheduledTimeout: () => void;
  readonly setTimeout: jest.Mock<ReturnType<typeof globalThis.setTimeout>, [() => void, number]>;
};

type AbortableWaitDependenciesOverrides = Partial<AbortableWaitDependencies>;

function createAbortableWaitDependenciesForTest(
  overrides: AbortableWaitDependenciesOverrides = {},
): AbortableWaitDependenciesForTest {
  let scheduledTimeoutHandler: (() => void) | undefined;

  const setTimeout = jest.fn(
    overrides.setTimeout ??
      ((handler: () => void, _delayInMilliseconds: number) => {
        scheduledTimeoutHandler = handler;

        return 123 as ReturnType<typeof globalThis.setTimeout>;
      }),
  );
  const clearTimeout = jest.fn(overrides.clearTimeout ?? (() => {}));

  return {
    abortableWaitDependencies: {
      clearTimeout,
      setTimeout,
    },
    clearTimeout,
    invokeScheduledTimeout() {
      if (scheduledTimeoutHandler === undefined) {
        throw new Error('No timeout handler was scheduled.');
      }

      scheduledTimeoutHandler();
    },
    setTimeout,
  };
}

describe('AbortableWait', () => {
  it('resolves after the requested duration when no abort signal is provided', async () => {
    const {abortableWaitDependencies, clearTimeout, invokeScheduledTimeout, setTimeout} =
      createAbortableWaitDependenciesForTest();
    const abortableWait = createAbortableWait(abortableWaitDependencies);

    const waitPromise = abortableWait.waitForDurationInMilliseconds(100, Maybe.nothing());

    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 100);

    invokeScheduledTimeout();

    await expect(waitPromise).resolves.toBeUndefined();
    expect(clearTimeout).not.toHaveBeenCalled();
  });

  it('resolves after the requested duration when the abort signal is not aborted', async () => {
    const {abortableWaitDependencies, clearTimeout, invokeScheduledTimeout, setTimeout} =
      createAbortableWaitDependenciesForTest();
    const abortableWait = createAbortableWait(abortableWaitDependencies);
    const abortController = new AbortController();

    const waitPromise = abortableWait.waitForDurationInMilliseconds(100, Maybe.just(abortController.signal));

    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 100);

    invokeScheduledTimeout();

    await expect(waitPromise).resolves.toBeUndefined();
    expect(clearTimeout).not.toHaveBeenCalled();
  });

  it('rejects when aborted before the requested duration elapses', async () => {
    const {abortableWaitDependencies, clearTimeout, setTimeout} = createAbortableWaitDependenciesForTest();
    const abortableWait = createAbortableWait(abortableWaitDependencies);
    const abortController = new AbortController();

    const waitPromise = abortableWait.waitForDurationInMilliseconds(100, Maybe.just(abortController.signal));

    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 100);

    abortController.abort();

    await expect(waitPromise).rejects.toThrow('The wait was aborted.');
    expect(clearTimeout).toHaveBeenCalledWith(123);
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const {abortableWaitDependencies, clearTimeout, setTimeout} = createAbortableWaitDependenciesForTest();
    const abortableWait = createAbortableWait(abortableWaitDependencies);
    const abortController = new AbortController();
    abortController.abort();

    const waitPromise = abortableWait.waitForDurationInMilliseconds(100, Maybe.just(abortController.signal));

    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 100);

    await expect(waitPromise).rejects.toThrow('The wait was aborted.');
    expect(clearTimeout).toHaveBeenCalledWith(123);
  });
});
