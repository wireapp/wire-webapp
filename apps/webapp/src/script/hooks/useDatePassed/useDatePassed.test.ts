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

  it('does not call the callback when target date is in the future', () => {
    const callback = jest.fn();
    const target = new Date(baseDate.getTime() + 2000);

    renderHook(() => useDatePassed({target, callback}));

    jest.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
  });

  it('calls the callback when target date has passed', () => {
    const callback = jest.fn();
    const target = new Date(baseDate.getTime() + 1000);

    renderHook(() => useDatePassed({target, callback}));

    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('calls the callback when dates are equal', () => {
    const callback = jest.fn();
    const target = new Date(baseDate);

    renderHook(() => useDatePassed({target, callback}));

    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not call the callback when hook is disabled', () => {
    const callback = jest.fn();
    const target = new Date(baseDate.getTime() + 1000);

    const {rerender} = renderHook(({enabled, target}) => useDatePassed({target, callback, enabled}), {
      initialProps: {enabled: false, target},
    });

    jest.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();

    const newTarget = new Date(baseDate.getTime() + 2000);
    rerender({enabled: true, target: newTarget});

    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('resets and works again when the target changes after the date has passed', () => {
    const callback = jest.fn();
    const target = new Date(baseDate.getTime() + 1000);

    const {rerender} = renderHook(({target, enabled}) => useDatePassed({target, callback, enabled}), {
      initialProps: {target, enabled: true},
    });

    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    callback.mockClear();

    rerender({target, enabled: false});

    const newTarget = new Date(baseDate.getTime() + 2000);
    rerender({target: newTarget, enabled: true});

    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
