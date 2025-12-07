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

import {amplify} from 'amplify';
import {useAppNotification} from 'Components/AppNotification';
import {MicOnIcon} from 'Components/Icon';
import {useActiveWindowState} from 'Hooks/useActiveWindow';
import {useKeyPressAndHold} from 'Hooks/useKeyPressAndHold/useKeyPressAndHold';
import {CallingViewMode, CallState} from 'Repositories/calling/CallState';
import {EventName} from 'Repositories/tracking/EventName';
import {KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {WebAppEvents} from '@wireapp/webapp-events';

interface UsePressSpaceToUnmuteParams {
  callState: CallState;
  toggleMute: (shouldMute: boolean) => void;
  isMuted: () => boolean;
  enabled: boolean;
}

const HOLD_DELAY_MS = 200;

export const usePressSpaceToUnmute = ({callState, toggleMute, isMuted, enabled}: UsePressSpaceToUnmuteParams) => {
  const isInCallAndViewMode = checkUserInCallAndViewMode(callState);

  const {detachedWindow, viewMode} = callState;

  const activeWindow = viewMode() === CallingViewMode.DETACHED_WINDOW ? detachedWindow()! : window;

  const micOnNotification = useAppNotification({
    message: t('videoCallParticipantPressSpaceToUnmuteNotification'),
    icon: MicOnIcon,
    activeWindow,
    withCloseButton: false,
    autoClose: false,
  });

  useKeyPressAndHold({
    key: KEY.SPACE,
    enabled: enabled && isInCallAndViewMode,
    activeWindow,
    holdDelayMs: HOLD_DELAY_MS,
    onHold: () => {
      if (!isMuted()) {
        return false;
      }

      toggleMute(false);
      micOnNotification.show();
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.CALLING.PRESS_SPACE_TO_UNMUTE);

      return true;
    },
    onRelease: () => {
      toggleMute(true);
      micOnNotification.close();
    },
  });
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
