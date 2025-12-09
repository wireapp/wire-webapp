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

import {renderHook, act} from '@testing-library/react';

import {useFileHistoryModal} from './useFileHistoryModal';

describe('useFileHistoryModal', () => {
  it('should initialize with closed state', () => {
    const {result} = renderHook(() => useFileHistoryModal());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.nodeUuid).toBeNull();
  });

  it('should open modal with provided node UUID', () => {
    const {result} = renderHook(() => useFileHistoryModal());
    const testUuid = 'test-uuid-123';

    act(() => {
      result.current.showModal(testUuid);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.nodeUuid).toBe(testUuid);
  });

  it('should close modal and reset state', () => {
    const {result} = renderHook(() => useFileHistoryModal());
    const testUuid = 'test-uuid-123';

    // First open the modal
    act(() => {
      result.current.showModal(testUuid);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.nodeUuid).toBe(testUuid);

    // Then close it
    act(() => {
      result.current.hideModal();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.nodeUuid).toBeNull();
  });

  it('should update node UUID when opening modal multiple times', () => {
    const {result} = renderHook(() => useFileHistoryModal());
    const firstUuid = 'first-uuid';
    const secondUuid = 'second-uuid';

    act(() => {
      result.current.showModal(firstUuid);
    });

    expect(result.current.nodeUuid).toBe(firstUuid);

    act(() => {
      result.current.showModal(secondUuid);
    });

    expect(result.current.nodeUuid).toBe(secondUuid);
    expect(result.current.isOpen).toBe(true);
  });

  it('should persist state across multiple renders', () => {
    const {result, rerender} = renderHook(() => useFileHistoryModal());
    const testUuid = 'test-uuid-123';

    act(() => {
      result.current.showModal(testUuid);
    });

    rerender();

    expect(result.current.isOpen).toBe(true);
    expect(result.current.nodeUuid).toBe(testUuid);
  });
});
