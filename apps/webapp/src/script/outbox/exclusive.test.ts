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

import {createExclusive} from './exclusive';

describe('createExclusive', () => {
  it('runs tasks one after another in the order they were given', async () => {
    const exclusive = createExclusive();
    const events: string[] = [];
    let finishFirst: () => void = () => {
      return undefined;
    };

    const first = exclusive.run(async () => {
      events.push('first started');
      await new Promise<void>(resolve => {
        finishFirst = resolve;
      });
      events.push('first finished');
    });
    const second = exclusive.run(async () => {
      events.push('second started');
    });
    await Promise.resolve();
    expect(events).toEqual(['first started']);

    finishFirst();
    await Promise.all([first, second]);

    expect(events).toEqual(['first started', 'first finished', 'second started']);
  });

  it('answers each task with its own result', async () => {
    const exclusive = createExclusive();

    const results = await Promise.all([
      exclusive.run(async () => {
        return 1;
      }),
      exclusive.run(async () => {
        return 'two';
      }),
    ]);

    expect(results).toEqual([1, 'two']);
  });

  it('keeps running tasks after one rejected', async () => {
    const exclusive = createExclusive();

    await expect(
      exclusive.run(async () => {
        return Promise.reject(new Error('boom'));
      }),
    ).rejects.toThrow('boom');

    await expect(
      exclusive.run(async () => {
        return 'next';
      }),
    ).resolves.toBe('next');
  });

  it('is idle once every task given so far has finished', async () => {
    const exclusive = createExclusive();
    const events: string[] = [];
    void exclusive.run(async () => {
      events.push('task');
    });

    await exclusive.whenIdle();

    expect(events).toEqual(['task']);
  });
});
