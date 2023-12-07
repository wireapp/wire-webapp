/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {waitFor} from './waitFor';

describe('waitFor', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  it('should resolve if condition is true', async () => {
    const condition = jest.fn().mockReturnValue(true);

    const result = await waitFor(condition);

    expect(result).toBe(true);
  });

  it('should resolve if condition is true after some time', async () => {
    const condition = jest.fn().mockReturnValue(false);
    setTimeout(() => condition.mockReturnValue('hello'), 100);

    const promise = waitFor(condition, 200, 50);
    jest.advanceTimersByTime(101);

    const result = await promise;
    expect(result).toBe('hello');
  });

  it('should resolve with undefined if condition is never true', async () => {
    const condition = jest.fn().mockReturnValue(false);

    const promise = waitFor(condition, 50, 50);
    jest.runAllTimers();

    const result = await promise;
    expect(result).toBe(undefined);
  });
});
