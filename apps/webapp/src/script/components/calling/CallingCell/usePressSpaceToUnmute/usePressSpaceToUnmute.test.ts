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

import {useAppNotification} from 'Components/AppNotification';
import {useKeyPressAndHold} from 'Hooks/useKeyPressAndHold/useKeyPressAndHold';
import {CallingViewMode, CallState} from 'Repositories/calling/CallState';

import {usePressSpaceToUnmute} from './usePressSpaceToUnmute';

jest.mock('Hooks/useKeyPressAndHold/useKeyPressAndHold', () => ({
  useKeyPressAndHold: jest.fn(),
}));

jest.mock('Components/AppNotification', () => ({
  useAppNotification: jest.fn(),
}));

jest.mock('Hooks/useActiveWindow', () => ({
  useActiveWindowState: {
    getState: jest.fn().mockReturnValue({
      activeWindow: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      } as unknown as Window,
    }),
  },
}));

describe('usePressSpaceToUnmute', () => {
  const mockToggleMute = jest.fn();
  const mockIsMuted = jest.fn();
  const mockMicOnNotification = {
    show: jest.fn(),
    close: jest.fn(),
  };

  const defaultCallState = {
    joinedCall: () => true,
    viewMode: () => CallingViewMode.FULL_SCREEN,
    detachedWindow: (): Window | null => null,
  } as unknown as CallState;

  beforeEach(() => {
    jest.clearAllMocks();

    (useAppNotification as jest.Mock).mockReturnValue(mockMicOnNotification);
  });

  it("doesn't set up key press handler when not enabled", () => {
    renderHook(() =>
      usePressSpaceToUnmute({
        callState: defaultCallState,
        toggleMute: mockToggleMute,
        isMuted: () => true,
        enabled: false,
      }),
    );

    expect(useKeyPressAndHold).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it("doesn't set up key press handler when not in call", () => {
    const callStateNotInCall = {
      ...defaultCallState,
      joinedCall: () => false,
    } as unknown as CallState;

    renderHook(() =>
      usePressSpaceToUnmute({
        callState: callStateNotInCall,
        toggleMute: mockToggleMute,
        isMuted: () => true,
        enabled: true,
      }),
    );

    expect(useKeyPressAndHold).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('handles space key press when muted', () => {
    mockIsMuted.mockReturnValue(true);

    renderHook(() =>
      usePressSpaceToUnmute({
        callState: defaultCallState,
        toggleMute: mockToggleMute,
        isMuted: mockIsMuted,
        enabled: true,
      }),
    );

    const onHoldCallback = (useKeyPressAndHold as jest.Mock).mock.calls[0][0].onHold;

    onHoldCallback();

    expect(mockIsMuted).toHaveBeenCalled();
    expect(mockToggleMute).toHaveBeenCalledWith(false);
    expect(mockMicOnNotification.show).toHaveBeenCalled();
  });

  it("doesn't unmute when already unmuted on space key press", () => {
    mockIsMuted.mockReturnValue(false);

    renderHook(() =>
      usePressSpaceToUnmute({
        callState: defaultCallState,
        toggleMute: mockToggleMute,
        isMuted: mockIsMuted,
        enabled: true,
      }),
    );

    const onHoldCallback = (useKeyPressAndHold as jest.Mock).mock.calls[0][0].onHold;

    onHoldCallback();

    expect(mockIsMuted).toHaveBeenCalled();
    expect(mockToggleMute).not.toHaveBeenCalled();
    expect(mockMicOnNotification.show).not.toHaveBeenCalled();
  });

  it('mutes on key release', () => {
    renderHook(() =>
      usePressSpaceToUnmute({
        callState: defaultCallState,
        toggleMute: mockToggleMute,
        isMuted: () => true,
        enabled: true,
      }),
    );

    const onReleaseCallback = (useKeyPressAndHold as jest.Mock).mock.calls[0][0].onRelease;

    onReleaseCallback();

    expect(mockToggleMute).toHaveBeenCalledWith(true);
    expect(mockMicOnNotification.close).toHaveBeenCalled();
  });

  it('works with detached window view', () => {
    const mockActiveWindow = typeof window !== 'undefined' ? window : {};

    const detachedCallState = {
      ...defaultCallState,
      viewMode: () => CallingViewMode.DETACHED_WINDOW,
      detachedWindow: () => mockActiveWindow,
    } as unknown as CallState;

    jest
      .spyOn(require('Hooks/useActiveWindow').useActiveWindowState, 'getState')
      .mockReturnValue({activeWindow: mockActiveWindow});

    renderHook(() =>
      usePressSpaceToUnmute({
        callState: detachedCallState,
        toggleMute: mockToggleMute,
        isMuted: () => true,
        enabled: true,
      }),
    );

    expect(useKeyPressAndHold).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        activeWindow: mockActiveWindow,
      }),
    );
  });
});
