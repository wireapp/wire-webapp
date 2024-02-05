/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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
import {act} from 'react-dom/test-utils';

import {useRoveFocus} from './useRoveFocus';

function createEvent(key: string) {
  return {key, preventDefault: () => {}} as KeyboardEvent;
}

describe('useRoveFocus', () => {
  it('should set the initial focus to the default value', () => {
    const {result} = renderHook(() => useRoveFocus(['0', '1', '2']));
    expect(result.current.focusedId).toBe(undefined);
  });

  it('should allow manually setting the focused index and navigate using the down/up arrow keys', () => {
    const {result} = renderHook(() => useRoveFocus(['0', '1', '2']));
    act(() => result.current.setFocusedId('1'));
    expect(result.current.focusedId).toBe('1');

    act(() => result.current.handleKeyDown(createEvent('ArrowDown')));
    expect(result.current.focusedId).toBe('2');

    act(() => result.current.handleKeyDown(createEvent('ArrowUp')));
    expect(result.current.focusedId).toBe('1');

    act(() => result.current.handleKeyDown(createEvent('ArrowUp')));
    expect(result.current.focusedId).toBe('0');
  });

  it('should set the focus to the next item when the arrow down key is pressed', () => {
    const {result} = renderHook(() => useRoveFocus(['0', '1', '2']));
    act(() => result.current.handleKeyDown(createEvent('ArrowDown')));
    expect(result.current.focusedId).toBe('0');
  });

  it('should set the focus to the previous item when the arrow up key is pressed', () => {
    const {result} = renderHook(() => useRoveFocus(['0', '1', '2']));
    act(() => result.current.handleKeyDown(createEvent('ArrowUp')));
    expect(result.current.focusedId).toBe('2');
  });

  it('should set the focus to the first item when the tab key is pressed', () => {
    const {result} = renderHook(() => useRoveFocus(['0', '1', '2']));
    act(() => result.current.handleKeyDown(createEvent('Tab')));
    expect(result.current.focusedId).toBe('2');
  });

  it('should not change the focus when an unsupported key is pressed', () => {
    const {result} = renderHook(() => useRoveFocus(['0', '1', '2']));
    act(() => result.current.handleKeyDown(createEvent('Enter')));
    expect(result.current.focusedId).toBe(undefined);
  });

  it('should keep focused element stable as the array changes', () => {
    const {result, rerender} = renderHook(useRoveFocus, {initialProps: ['0', '1', '2']});

    act(() => result.current.setFocusedId('1'));
    expect(result.current.focusedId).toBe('1');

    // Adding one element at the end
    rerender(['0', '2', '3', '1']);
    expect(result.current.focusedId).toBe('1');
  });
});
