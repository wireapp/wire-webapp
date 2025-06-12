/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {useDatePassed} from './useDatePassed';

describe('useDatePassed', () => {
  const baseDate = new Date('2024-01-01T00:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(baseDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not call onPassed when target date is in the future', () => {
    const onPassed = jest.fn();
    const target = new Date(baseDate.getTime() + 2000);

    renderHook(() => useDatePassed({target, onPassed}));

    jest.advanceTimersByTime(1000);
    expect(onPassed).not.toHaveBeenCalled();
  });

  it('calls onPassed when target date has passed', () => {
    const onPassed = jest.fn();
    const target = new Date(baseDate.getTime() + 1000);

    renderHook(() => useDatePassed({target, onPassed}));

    jest.advanceTimersByTime(1000);
    expect(onPassed).toHaveBeenCalledTimes(1);
  });

  it('calls onPassed when dates are equal', () => {
    const onPassed = jest.fn();
    const target = new Date(baseDate);

    renderHook(() => useDatePassed({target, onPassed}));

    jest.advanceTimersByTime(1000);
    expect(onPassed).toHaveBeenCalledTimes(1);
  });

  it('resets and works again when target changes after date has passed', () => {
    const onPassed = jest.fn();
    const target = new Date(baseDate.getTime() + 1000);

    const {rerender} = renderHook(() => useDatePassed({target, onPassed}));

    // First target passes
    jest.advanceTimersByTime(1000);
    expect(onPassed).toHaveBeenCalledTimes(1);

    // Clear the mock to start fresh
    onPassed.mockClear();

    // Change target to a new future time
    const newTarget = new Date(baseDate.getTime() + 2000);
    rerender({target: newTarget, onPassed});

    // Advance time to reach new target
    jest.advanceTimersByTime(1000);
    expect(onPassed).toHaveBeenCalledTimes(1);
  });

  it('does not set up interval when target is null', () => {
    const onPassed = jest.fn();
    const target = null;

    renderHook(() => useDatePassed({target, onPassed}));

    jest.advanceTimersByTime(1000);
    expect(onPassed).not.toHaveBeenCalled();
  });

  it('cleans up interval when target changes to null', () => {
    const onPassed = jest.fn();
    const target = new Date(baseDate.getTime() + 1000);

    const {rerender} = renderHook(() => useDatePassed({target, onPassed}));

    // Change target to null
    rerender({target: null, onPassed});

    jest.advanceTimersByTime(1000);
    expect(onPassed).not.toHaveBeenCalled();
  });
});
