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

import {renderHook} from '@testing-library/react';

import {useSyncCurrentRange} from './useSyncCurrentRange';

describe('useSyncCurrentRange', () => {
  it('should increment currentStart when currentPage is the last in the range but not the last page', () => {
    const setCurrentStart = jest.fn();

    const {rerender} = renderHook(
      (totalPages: number) => {
        useSyncCurrentRange({
          currentPage: 4,
          currentStart: 2,
          totalPages,
          setCurrentStart,
          visibleDots: 3,
        });
      },
      {initialProps: 5},
    );

    expect(setCurrentStart).toHaveBeenCalledTimes(0);

    rerender(6);

    expect(setCurrentStart).toHaveBeenCalledTimes(1);
    expect(setCurrentStart).toHaveBeenCalledWith(3);
  });

  it('should decrement currentStart when the end of the range is higher than the last page', () => {
    const setCurrentStart = jest.fn();

    const {rerender} = renderHook(
      (totalPages: number) => {
        useSyncCurrentRange({
          currentPage: 3,
          currentStart: 2,
          totalPages,
          setCurrentStart,
          visibleDots: 3,
        });
      },
      {initialProps: 5},
    );

    expect(setCurrentStart).toHaveBeenCalledTimes(0);

    rerender(4);

    expect(setCurrentStart).toHaveBeenCalledTimes(1);
    expect(setCurrentStart).toHaveBeenCalledWith(1);
  });

  it('should not change currentStart when conditions are not met', () => {
    const setCurrentStart = jest.fn();

    const {rerender} = renderHook(
      (totalPages: number) => {
        useSyncCurrentRange({
          currentPage: 2,
          currentStart: 1,
          totalPages,
          setCurrentStart,
          visibleDots: 3,
        });
      },
      {initialProps: 5},
    );

    expect(setCurrentStart).toHaveBeenCalledTimes(0);

    rerender(6);
    expect(setCurrentStart).toHaveBeenCalledTimes(0);

    rerender(7);
    expect(setCurrentStart).toHaveBeenCalledTimes(0);

    rerender(4);
    expect(setCurrentStart).toHaveBeenCalledTimes(0);
  });

  it('should not do anything if visibleDots is larger than totalPages', () => {
    const setCurrentStart = jest.fn();

    const {rerender} = renderHook(
      ({totalPages, visibleDots}) => {
        useSyncCurrentRange({
          currentPage: 2,
          currentStart: 1,
          totalPages,
          setCurrentStart,
          visibleDots,
        });
      },
      {initialProps: {totalPages: 4, visibleDots: 3}},
    );

    expect(setCurrentStart).toHaveBeenCalledTimes(0);

    rerender({totalPages: 4, visibleDots: 6});
    expect(setCurrentStart).toHaveBeenCalledTimes(0);
  });
});
