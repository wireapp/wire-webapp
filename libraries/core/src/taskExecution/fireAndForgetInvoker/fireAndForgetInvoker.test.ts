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

import {createFireAndForgetInvoker} from './fireAndForgetInvoker';
import {noop} from 'noop-esm';

describe('createFireAndForgetInvoker', () => {
  it('invokes action without waiting for completion', () => {
    const logger = {error: jest.fn()};
    const fireAndForgetInvoker = createFireAndForgetInvoker({logger});
    const asyncAction = jest.fn(async () => {
      return 'resolved';
    });

    fireAndForgetInvoker.fireAndForget(asyncAction);

    expect(asyncAction).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('reports synchronous errors thrown by action', async () => {
    const logger = {error: jest.fn()};
    const expectedError = new Error('synchronous failure');
    const fireAndForgetInvoker = createFireAndForgetInvoker({logger});

    fireAndForgetInvoker.fireAndForget(() => {
      throw expectedError;
    });

    await fireAndForgetInvoker.waitUntilAllSettled();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith('failed to execute fire-and-forget action', expectedError);
  });

  it('reports rejected promise errors', async () => {
    const logger = {error: jest.fn()};
    const expectedError = new Error('asynchronous failure');
    const fireAndForgetInvoker = createFireAndForgetInvoker({logger});

    fireAndForgetInvoker.fireAndForget(async () => {
      throw expectedError;
    });

    await fireAndForgetInvoker.waitUntilAllSettled();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith('failed to execute fire-and-forget action', expectedError);
  });

  it('does not report errors when action resolves', async () => {
    const logger = {error: jest.fn()};
    const fireAndForgetInvoker = createFireAndForgetInvoker({logger});

    fireAndForgetInvoker.fireAndForget(async () => {
      return 'ok';
    });

    await fireAndForgetInvoker.waitUntilAllSettled();

    expect(logger.error).not.toHaveBeenCalled();
  });

  it('waitUntilAllSettled waits for all active actions', async () => {
    const logger = {error: jest.fn()};
    const fireAndForgetInvoker = createFireAndForgetInvoker({logger});
    let resolveFirstAction: (value: string) => void = noop;
    let resolveSecondAction: (value: string) => void = noop;

    fireAndForgetInvoker.fireAndForget(() => {
      return new Promise(resolve => {
        resolveFirstAction = resolve;
      });
    });

    fireAndForgetInvoker.fireAndForget(() => {
      return new Promise(resolve => {
        resolveSecondAction = resolve;
      });
    });

    const waitPromise = fireAndForgetInvoker.waitUntilAllSettled();
    let hasWaitFinished = false;

    waitPromise.then(() => {
      hasWaitFinished = true;
    });

    await Promise.resolve();
    expect(hasWaitFinished).toBe(false);

    resolveFirstAction('first');
    await Promise.resolve();
    expect(hasWaitFinished).toBe(false);

    resolveSecondAction('second');
    await waitPromise;
    expect(hasWaitFinished).toBe(true);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
