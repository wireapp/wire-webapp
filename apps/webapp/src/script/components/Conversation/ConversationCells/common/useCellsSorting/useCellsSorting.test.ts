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

import {act, renderHook} from '@testing-library/react';

import {useCellsSorting} from './useCellsSorting';

describe('useCellsSorting', () => {
  it('starts without a selected sort', () => {
    const {result} = renderHook(() => useCellsSorting());

    expect(result.current.sort).toBeNull();
    expect(result.current.getDirectionFor('name_ci')).toBeUndefined();
    expect(result.current.getDirectionFor('mtime')).toBeUndefined();
    expect(result.current.getDirectionFor('size')).toBeUndefined();
  });

  it('applies the default direction when selecting a sort field', () => {
    const {result} = renderHook(() => useCellsSorting());

    act(() => result.current.toggleSort('name_ci'));
    expect(result.current.sort).toEqual({field: 'name_ci', direction: 'asc'});
    expect(result.current.getDirectionFor('name_ci')).toBe('asc');

    act(() => result.current.toggleSort('mtime'));
    expect(result.current.sort).toEqual({field: 'mtime', direction: 'desc'});
    expect(result.current.getDirectionFor('mtime')).toBe('desc');

    act(() => result.current.toggleSort('size'));
    expect(result.current.sort).toEqual({field: 'size', direction: 'asc'});
    expect(result.current.getDirectionFor('size')).toBe('asc');
  });

  it('toggles the active sort field between ascending and descending', () => {
    const {result} = renderHook(() => useCellsSorting());

    act(() => result.current.toggleSort('name_ci'));
    expect(result.current.sort).toEqual({field: 'name_ci', direction: 'asc'});

    act(() => result.current.toggleSort('name_ci'));
    expect(result.current.sort).toEqual({field: 'name_ci', direction: 'desc'});

    act(() => result.current.toggleSort('name_ci'));
    expect(result.current.sort).toEqual({field: 'name_ci', direction: 'asc'});
  });

  it('returns a direction only for the active sort field', () => {
    const {result} = renderHook(() => useCellsSorting());

    act(() => result.current.toggleSort('mtime'));

    expect(result.current.getDirectionFor('name_ci')).toBeUndefined();
    expect(result.current.getDirectionFor('mtime')).toBe('desc');
    expect(result.current.getDirectionFor('size')).toBeUndefined();
  });

  it('resets sorting to the unsorted state', () => {
    const {result} = renderHook(() => useCellsSorting());

    act(() => result.current.toggleSort('size'));
    expect(result.current.sort).toEqual({field: 'size', direction: 'asc'});

    act(() => result.current.resetSort());

    expect(result.current.sort).toBeNull();
    expect(result.current.getDirectionFor('size')).toBeUndefined();
  });
});
