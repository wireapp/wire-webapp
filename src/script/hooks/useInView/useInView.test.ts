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
  const mockIntersectionObserver = jest.fn();
  let observerCallback: (entries: IntersectionObserverEntry[]) => void;

  beforeEach(() => {
    mockIntersectionObserver.mockImplementation((callback: (entries: IntersectionObserverEntry[]) => void) => {
      observerCallback = callback;
      return {
        observe: jest.fn(),
        disconnect: jest.fn(),
      };
    });

    window.IntersectionObserver = mockIntersectionObserver;
  });

  it('initializes with element not in view', () => {
    const {result} = renderHook(() => useInView());
    const {isInView} = result.current;

    expect(isInView).toBe(false);
  });

  it('updates isInView state when intersection changes', () => {
    const {result} = renderHook(() => useInView());

    act(() => {
      observerCallback([{isIntersecting: true} as IntersectionObserverEntry]);
    });

    const {isInView} = result.current;
    expect(isInView).toBe(true);
  });

  it('creates IntersectionObserver with provided options', () => {
    const options = {
      root: document.createElement('div'),
      rootMargin: '10px',
      threshold: 0.5,
    };

    renderHook(() => useInView(options));

    expect(mockIntersectionObserver).toHaveBeenCalledWith(expect.any(Function), options);
  });

  it('disconnects observer on unmount', () => {
    const disconnect = jest.fn();
    mockIntersectionObserver.mockImplementation(() => ({
      observe: jest.fn(),
      disconnect,
    }));

    const {unmount} = renderHook(() => useInView());
    unmount();

    expect(disconnect).toHaveBeenCalled();
  });

  it('respects rootMargin option when determining visibility', () => {
    const {result} = renderHook(() =>
      useInView({
        rootMargin: '50px',
      }),
    );

    act(() => {
      // Simulate an element that would be just outside the viewport
      // but within the rootMargin area
      observerCallback([
        {
          isIntersecting: true,
          boundingClientRect: {
            top: -45, // element is 45px above viewport
            bottom: 0,
            left: 0,
            right: 0,
          },
        } as IntersectionObserverEntry,
      ]);
    });

    const {isInView} = result.current;
    expect(isInView).toBe(true);
  });
});
