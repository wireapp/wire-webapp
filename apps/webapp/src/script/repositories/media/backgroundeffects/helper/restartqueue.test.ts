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

import {createRestartQueue} from './restartqueue';

const flushPromises = () => Promise.resolve();

describe('createRestartQueue', () => {
  it('runs restarts sequentially', async () => {
    const calls: string[] = [];

    let resolveFirst!: () => void;

    const restart = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>(resolve => {
            calls.push('first-start');

            resolveFirst = () => {
              calls.push('first-end');
              resolve();
            };
          }),
      )
      .mockImplementationOnce(async () => {
        calls.push('second-start');
        calls.push('second-end');
      });

    const enqueueRestart = createRestartQueue(restart);

    const first = enqueueRestart();
    const second = enqueueRestart();

    await flushPromises();

    expect(calls).toEqual(['first-start']);

    resolveFirst();

    await first;
    await second;

    expect(calls).toEqual(['first-start', 'first-end', 'second-start', 'second-end']);

    expect(restart).toHaveBeenCalledTimes(2);
  });

  it('continues after a rejected restart', async () => {
    const restart = jest.fn().mockRejectedValueOnce(new Error('restart failed')).mockResolvedValueOnce(undefined);

    const enqueueRestart = createRestartQueue(restart);

    await expect(enqueueRestart()).rejects.toThrow('restart failed');
    await expect(enqueueRestart()).resolves.toBeUndefined();

    expect(restart).toHaveBeenCalledTimes(2);
  });
});
