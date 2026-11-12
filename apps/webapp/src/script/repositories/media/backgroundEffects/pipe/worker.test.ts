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

import {noop} from 'noop-esm';

import {defaultWorkerOpts} from './options';

describe('Background effects worker diagnostics', () => {
  it('keeps worker initialization failure details in console text and the error notification', async () => {
    const originalOnMessage = window.onmessage;
    const error = new Error('WebGL context creation failed');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(noop);
    const {promise: failureNotification, resolve: resolveFailureNotification} = Promise.withResolvers<unknown>();
    jest.spyOn(globalThis, 'postMessage').mockImplementation((message: unknown) => {
      resolveFailureNotification(message);
    });

    try {
      await import('./worker');

      window.onmessage?.(
        new MessageEvent('message', {
          data: {
            name: 'runSegmenter',
            canvas: {
              getContext: () => {
                throw error;
              },
            },
            readable: {},
            options: defaultWorkerOpts,
          },
        }),
      );

      const actualFailureNotification = await failureNotification;

      expect(consoleError).toHaveBeenCalledWith(
        '[virtual-background-worker]',
        '[virtual-background] video error: WebGL context creation failed',
        {error},
      );
      expect(actualFailureNotification).toEqual({
        name: 'error',
        reason: 'segmenter-init-failed',
        message: 'WebGL context creation failed',
      });
    } finally {
      window.onmessage = originalOnMessage;
      jest.restoreAllMocks();
    }
  });
});
