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

function createIntersectionObserver(
  _callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {},
): IntersectionObserver {
  return {
    disconnect: jest.fn(),
    observe: jest.fn(),
    root: options.root ?? null,
    rootMargin: options.rootMargin ?? '0px',
    takeRecords: jest.fn(() => {
      return [];
    }),
    thresholds: Array.isArray(options.threshold) ? options.threshold : [options.threshold ?? 0],
    unobserve: jest.fn(),
  };
}

Object.defineProperty(window, 'IntersectionObserver', {
  configurable: true,
  value: jest.fn(createIntersectionObserver),
  writable: true,
});
