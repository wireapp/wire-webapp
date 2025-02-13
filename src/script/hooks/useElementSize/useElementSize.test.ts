/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import React from 'react';

import {act, renderHook} from '@testing-library/react';

import {useElementSize} from './useElementSize';

describe('useElementSize', () => {
  let mockObserve: jest.Mock;
  let mockDisconnect: jest.Mock;
  let observerCallback: ResizeObserverCallback;
  let mockObserverInstance: ResizeObserver;
  let mockRef: {current: HTMLElement | null};

  beforeEach(() => {
    mockObserve = jest.fn();
    mockDisconnect = jest.fn();
    observerCallback = () => {};
    mockRef = {current: null};

    window.ResizeObserver = class MockResizeObserver implements ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        observerCallback = callback;
        mockObserverInstance = this;
      }
      observe = mockObserve;
      disconnect = mockDisconnect;
      unobserve = jest.fn();
    } as unknown as typeof window.ResizeObserver;

    jest.spyOn(React, 'useRef').mockReturnValue(mockRef);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('initializes with zero dimensions', () => {
    const {result} = renderHook(() => useElementSize());
    expect(result.current.width).toBe(0);
    expect(result.current.height).toBe(0);
  });

  it('updates dimensions when resize is observed', () => {
    const divElement = document.createElement('div');
    mockRef.current = divElement;

    const {result} = renderHook(() => useElementSize());

    act(() => {
      observerCallback(
        [
          {
            contentRect: {width: 100, height: 200},
          } as ResizeObserverEntry,
        ],
        mockObserverInstance,
      );
    });

    expect(result.current.width).toBe(100);
    expect(result.current.height).toBe(200);
  });

  it('disconnects observer on unmount', () => {
    const divElement = document.createElement('div');
    mockRef.current = divElement;

    const {unmount} = renderHook(() => useElementSize());

    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('does not observe if ref is null', () => {
    const {result} = renderHook(() => useElementSize());

    expect(result.current.ref.current).toBeNull();
    expect(mockObserve).not.toHaveBeenCalled();
  });

  it('handles invalid entries array', () => {
    const {result} = renderHook(() => useElementSize());
    const divElement = document.createElement('div');
    const refObj = {current: divElement};
    Object.defineProperty(result.current, 'ref', {value: refObj});

    const initialWidth = result.current.width;
    const initialHeight = result.current.height;

    act(() => {
      observerCallback(null as unknown as ResizeObserverEntry[], mockObserverInstance);
    });

    expect(result.current.width).toBe(initialWidth);
    expect(result.current.height).toBe(initialHeight);
  });

  it('handles empty entries array', () => {
    const {result, rerender} = renderHook(() => useElementSize());
    const divElement = document.createElement('div');
    const refObj = {current: divElement};
    Object.defineProperty(result.current, 'ref', {value: refObj});

    rerender();

    const initialWidth = result.current.width;
    const initialHeight = result.current.height;

    act(() => {
      observerCallback([], mockObserverInstance);
    });

    expect(result.current.width).toBe(initialWidth);
    expect(result.current.height).toBe(initialHeight);
  });

  it('handles multiple resize observations', () => {
    const divElement = document.createElement('div');
    mockRef.current = divElement;

    const {result} = renderHook(() => useElementSize());

    act(() => {
      observerCallback(
        [
          {
            contentRect: {width: 100, height: 200},
          } as ResizeObserverEntry,
        ],
        mockObserverInstance,
      );
    });

    expect(result.current.width).toBe(100);
    expect(result.current.height).toBe(200);

    act(() => {
      observerCallback(
        [
          {
            contentRect: {width: 150, height: 250},
          } as ResizeObserverEntry,
        ],
        mockObserverInstance,
      );
    });

    expect(result.current.width).toBe(150);
    expect(result.current.height).toBe(250);
  });

  it('works with different HTML element types', () => {
    const canvasElement = document.createElement('canvas');
    mockRef.current = canvasElement;

    const {result} = renderHook(() => useElementSize<HTMLCanvasElement>());

    act(() => {
      observerCallback(
        [
          {
            contentRect: {width: 100, height: 200},
          } as ResizeObserverEntry,
        ],
        mockObserverInstance,
      );
    });

    expect(result.current.ref.current).toBe(canvasElement);
    expect(result.current.width).toBe(100);
    expect(result.current.height).toBe(200);
  });

  it('maintains previous dimensions when entries array is invalid', () => {
    const {result, rerender} = renderHook(() => useElementSize());
    const divElement = document.createElement('div');
    const refObj = {current: divElement};
    Object.defineProperty(result.current, 'ref', {value: refObj});

    rerender();

    const initialWidth = result.current.width;
    const initialHeight = result.current.height;

    act(() => {
      observerCallback(null as unknown as ResizeObserverEntry[], mockObserverInstance);
    });

    expect(result.current.width).toBe(initialWidth);
    expect(result.current.height).toBe(initialHeight);
  });
});
