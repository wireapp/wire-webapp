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

import {useCallback, useEffect, useRef} from 'react';

import {useAppNotification} from 'Components/AppNotification';
import {useActiveWindowState} from 'Hooks/useActiveWindow';
import {CallingViewMode, CallState} from 'src/script/calling/CallState';
import {handleKeyPress, KEY} from 'Util/KeyboardUtil';

interface PushToTalk {
  callState: CallState;
  toggleMute: (shouldMute: boolean) => void;
  isMuted: () => boolean;
  enabled: boolean;
}

const HOLD_DELAY = 200;

export const usePressSpaceToUnmute = ({callState, toggleMute, isMuted, enabled}: PushToTalk) => {
  const isInCallAndViewMode = checkUserInCallAndViewMode(callState);

  const {detachedWindow, viewMode} = callState;

  const activeWindow = viewMode() === CallingViewMode.DETACHED_WINDOW ? detachedWindow()! : window;

  const micOnNotification = useAppNotification({
    message: 'Microphone temporarily on',
    activeWindow,
    autoClose: false,
  });

  const hasNotifiedRef = useRef(false);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startHoldTracking = useCallback(() => {
    if (!isMuted()) {
      return;
    }

    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
    }

    holdTimeoutRef.current = setTimeout(() => {
      if (hasNotifiedRef.current) {
        return;
      }

      toggleMute(false);
      micOnNotification.show();
      hasNotifiedRef.current = true;
    }, HOLD_DELAY);
  }, [micOnNotification, toggleMute, isMuted]);

  const stopHoldTracking = useCallback(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    toggleMute(true);
    micOnNotification.close();
    hasNotifiedRef.current = false;
  }, [toggleMute, micOnNotification]);

  useEffect(() => {
    if (!enabled || !isInCallAndViewMode) {
      return;
    }

    handleKeyPress(KEY.SPACE, activeWindow, {
      onPress: startHoldTracking,
      onRelease: stopHoldTracking,
    });
  }, [activeWindow, enabled, isInCallAndViewMode, startHoldTracking, stopHoldTracking]);
};

const checkUserInCallAndViewMode = (callState: CallState): boolean => {
  const {activeWindow} = useActiveWindowState.getState();
  const {viewMode, detachedWindow} = callState;

  const isInCall = !!callState.joinedCall();
  const isFullScreenView = CallingViewMode.FULL_SCREEN === viewMode();
  const isDetatchedWindowView = CallingViewMode.DETACHED_WINDOW === viewMode();
  const isHighlightedDetatchedWindow = isDetatchedWindowView && detachedWindow() === activeWindow;

  return isInCall && (isFullScreenView || isHighlightedDetatchedWindow);
};
