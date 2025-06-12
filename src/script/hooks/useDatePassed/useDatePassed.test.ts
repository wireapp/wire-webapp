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
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not call onPassed when target date is in the future', () => {
    const onPassed = jest.fn();
    const now = new Date('2024-01-01');
    const target = new Date('2024-12-31');

    renderHook(() => useDatePassed({now, target, onPassed}));

    expect(onPassed).not.toHaveBeenCalled();
  });

  it('calls onPassed when target date has passed', () => {
    const onPassed = jest.fn();
    const now = new Date('2024-12-31');
    const target = new Date('2024-01-01');

    renderHook(() => useDatePassed({now, target, onPassed}));

    expect(onPassed).toHaveBeenCalledTimes(1);
  });

  it('calls onPassed when dates are equal', () => {
    const onPassed = jest.fn();
    const now = new Date('2024-01-01');
    const target = new Date('2024-01-01');

    renderHook(() => useDatePassed({now, target, onPassed}));

    expect(onPassed).toHaveBeenCalledTimes(1);
  });

  it('calls onPassed only once when target date has passed', () => {
    const onPassed = jest.fn();
    const now = new Date('2024-12-31');
    const target = new Date('2024-01-01');

    const {rerender} = renderHook(() => useDatePassed({now, target, onPassed}));

    expect(onPassed).toHaveBeenCalledTimes(1);

    // Rerender with same dates
    rerender();
    expect(onPassed).toHaveBeenCalledTimes(1);

    // Rerender with different now date
    rerender({now: new Date('2025-01-01'), target, onPassed});
    expect(onPassed).toHaveBeenCalledTimes(1);
  });

  it('handles date updates correctly', () => {
    const onPassed = jest.fn();
    const now = new Date('2024-01-01');
    const target = new Date('2024-06-01');

    const {rerender} = renderHook(({now, target, onPassed}) => useDatePassed({now, target, onPassed}), {
      initialProps: {now, target, onPassed},
    });

    expect(onPassed).not.toHaveBeenCalled();

    // Update now to a date after target
    rerender({now: new Date('2024-07-01'), target, onPassed});
    expect(onPassed).toHaveBeenCalledTimes(1);
  });
});
