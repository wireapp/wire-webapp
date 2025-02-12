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

import {useInView} from './useInView';

describe('useInView', () => {
  let mockObserve: jest.Mock;
  let mockDisconnect: jest.Mock;
  let observerCallback: (entries: IntersectionObserverEntry[]) => void;

  beforeEach(() => {
    mockObserve = jest.fn();
    mockDisconnect = jest.fn();
    observerCallback = () => {};

    window.IntersectionObserver = jest.fn((callback, options) => {
      observerCallback = callback;
      return {
        observe: mockObserve,
        disconnect: mockDisconnect,
        unobserve: jest.fn(),
        takeRecords: jest.fn(),
        root: options?.root ?? null,
        rootMargin: options?.rootMargin ?? '0px',
        thresholds: Array.isArray(options?.threshold) ? options.threshold : [options?.threshold ?? 0],
      };
    }) as unknown as typeof window.IntersectionObserver;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('initializes with element not in view', () => {
    const {result} = renderHook(() => useInView());
    const {isInView} = result.current;

    expect(isInView).toBe(false);
  });

  it('updates isInView state when intersection changes', () => {
    const {result, rerender} = renderHook(() => useInView());

    act(() => {
      result.current.elementRef.current = document.createElement('div');
      rerender();
    });

    expect(mockObserve).toHaveBeenCalledWith(result.current.elementRef.current);

    act(() => {
      observerCallback([{isIntersecting: true} as IntersectionObserverEntry]);
    });

    expect(result.current.isInView).toBe(true);
  });

  it('disconnects observer on unmount', () => {
    const {result, rerender, unmount} = renderHook(() => useInView());

    act(() => {
      result.current.elementRef.current = document.createElement('div');
      rerender();
    });

    expect(mockObserve).toHaveBeenCalled();

    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('respects rootMargin option when determining visibility', () => {
    const {result, rerender} = renderHook(() =>
      useInView({
        rootMargin: '50px',
      }),
    );

    act(() => {
      result.current.elementRef.current = document.createElement('div');
      rerender();
    });

    expect(mockObserve).toHaveBeenCalled();

    act(() => {
      observerCallback([
        {
          isIntersecting: true,
          boundingClientRect: {
            top: -45,
            bottom: 0,
            left: 0,
            right: 0,
          },
        } as IntersectionObserverEntry,
      ]);
    });

    expect(result.current.isInView).toBe(true);
  });

  it('handles configuration options', () => {
    const threshold = 0.5;
    const {result, rerender} = renderHook(() => useInView({threshold}));

    act(() => {
      result.current.elementRef.current = document.createElement('div');
      rerender();
    });

    expect(window.IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({threshold}),
    );
  });

  it('tracks if element has ever been in view', () => {
    const {result, rerender} = renderHook(() => useInView());

    act(() => {
      result.current.elementRef.current = document.createElement('div');
      rerender();
    });

    expect(result.current.hasBeenInView).toBe(false);

    act(() => {
      observerCallback([{isIntersecting: true} as IntersectionObserverEntry]);
    });

    expect(result.current.hasBeenInView).toBe(true);

    act(() => {
      observerCallback([{isIntersecting: false} as IntersectionObserverEntry]);
    });

    expect(result.current.hasBeenInView).toBe(true);
    expect(result.current.isInView).toBe(false);
  });
});
