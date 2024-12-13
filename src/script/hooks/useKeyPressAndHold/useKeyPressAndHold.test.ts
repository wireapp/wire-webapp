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

import {act, renderHook} from '@testing-library/react';

import {KEY} from 'Util/KeyboardUtil';

import {useKeyPressAndHold} from './useKeyPressAndHold';

jest.useFakeTimers();

describe('useKeyPressAndHold', () => {
  const mockOnHold = jest.fn();
  const mockOnRelease = jest.fn();
  const defaultProps = {
    key: KEY.SPACE,
    onHold: mockOnHold,
    onRelease: mockOnRelease,
    holdDelay: 200,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    // Clean up any existing event listeners
    window.removeEventListener('keydown', expect.any(Function));
    window.removeEventListener('keyup', expect.any(Function));
  });

  afterEach(() => {
    // Cleanup after each test
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  it('triggers onHold after holdDelay and onRelease when key is released', () => {
    renderHook(() => useKeyPressAndHold(defaultProps));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {key: KEY.SPACE}));
    });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(mockOnHold).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', {key: KEY.SPACE}));
    });

    expect(mockOnRelease).toHaveBeenCalledTimes(1);
  });

  it('not trigger onHold if key is released before holdDelay', () => {
    renderHook(() => useKeyPressAndHold(defaultProps));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {key: KEY.SPACE}));
    });

    act(() => {
      jest.advanceTimersByTime(100);
      window.dispatchEvent(new KeyboardEvent('keyup', {key: KEY.SPACE}));
    });

    expect(mockOnHold).not.toHaveBeenCalled();
    expect(mockOnRelease).toHaveBeenCalledTimes(1);
  });

  it('not respond to key events when disabled', () => {
    renderHook(() => useKeyPressAndHold({...defaultProps, enabled: false}));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {key: KEY.SPACE}));
      jest.advanceTimersByTime(200);
      window.dispatchEvent(new KeyboardEvent('keyup', {key: KEY.SPACE}));
    });

    expect(mockOnHold).not.toHaveBeenCalled();
    expect(mockOnRelease).not.toHaveBeenCalled();
  });

  it('cleans up timeouts on unmount', () => {
    const {unmount} = renderHook(() => useKeyPressAndHold(defaultProps));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {key: KEY.SPACE}));
    });

    unmount();

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(mockOnHold).not.toHaveBeenCalled();
  });

  it('handles multiple key presses correctly', () => {
    renderHook(() => useKeyPressAndHold(defaultProps));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {key: KEY.SPACE}));
      jest.advanceTimersByTime(200);
    });

    expect(mockOnHold).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', {key: KEY.SPACE}));
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {key: KEY.SPACE}));
      jest.advanceTimersByTime(200);
    });

    expect(mockOnHold).toHaveBeenCalledTimes(2);
  });

  it('uses custom active window when provided', () => {
    const mockWindow = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    } as unknown as Window;

    renderHook(() => useKeyPressAndHold({...defaultProps, activeWindow: mockWindow}));

    expect(mockWindow.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    expect(mockWindow.addEventListener).toHaveBeenCalledWith('keyup', expect.any(Function), true);
  });
});
