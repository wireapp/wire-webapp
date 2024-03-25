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

import {renderHook} from '@testing-library/react';

import {useDebounce} from './useDebounce';

describe('useDebounce', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should debounce the callback', () => {
    const callback = jest.fn();
    const time = 1000;

    renderHook(() => useDebounce(callback, time));

    jest.advanceTimersByTime(time - 1);
    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalled();
  });

  it('should only call the callback once when multiple calls are made within the debounce time', () => {
    const callback = jest.fn();
    const time = 1000;

    renderHook(() => useDebounce(callback, time));

    jest.advanceTimersByTime(200);
    jest.advanceTimersByTime(800);
    jest.advanceTimersByTime(200);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not call the callback if it is unmounted before the debounce time is over', () => {
    const callback = jest.fn();
    const time = 1000;

    const {unmount} = renderHook(() => useDebounce(callback, time));

    unmount();
    jest.advanceTimersByTime(1500);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should re-run the effect when the dependencies change', () => {
    const callback = jest.fn();
    const time = 1000;
    const deps = ['dep1'];

    const {rerender} = renderHook(({deps}) => useDebounce(callback, time, deps), {
      initialProps: {deps},
    });

    jest.advanceTimersByTime(500);
    expect(callback).not.toHaveBeenCalled();

    rerender({deps: ['dep2']});

    // Re-render will clear the current timeout so need to wait for 1000ms for the callback to be called
    jest.advanceTimersByTime(500);
    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalled();
  });
});
