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

import {useEffect, useRef} from 'react';

import {createAppNotification} from 'Components/AppNotification';
import {useActiveWindowState} from 'Hooks/useActiveWindow';
import {CallingViewMode, CallState} from 'src/script/calling/CallState';
import {handleKeyPress} from 'Util/KeyboardUtil';

interface PushToTalk {
  callState: CallState;
  toggleMute: (shouldMute: boolean) => void;
  isMuted: () => boolean;
  enabled: boolean;
}

const subscribeToKeyPress = ({
  toggleMute,
  isMuted,
  wasUnmutedWithKeyPressRef,
}: Omit<PushToTalk, 'enabled'> & {key: string; wasUnmutedWithKeyPressRef: React.MutableRefObject<boolean>}) => {
  const micOnNotification = createAppNotification();
  let pressTimeout: NodeJS.Timeout | null = null;

  return handleKeyPress(' ', {
    onPress: () => {
      console.log('onPress');
      // If we are already unmuted, we do nothing.
      if (!isMuted()) {
        return;
      }

      pressTimeout = setTimeout(() => {
        micOnNotification.show('Microphone temporarily on');
        wasUnmutedWithKeyPressRef.current = true;
        toggleMute(false);
      }, 200); // Adjust the delay as needed
    },
    onRelease: () => {
      console.log('onRelease');
      if (pressTimeout) {
        clearTimeout(pressTimeout);
        pressTimeout = null;
      }

      // If we were unmuted with the key press, we mute again.
      // (This is to prevent muting when first unmuted with the unmute button)
      if (wasUnmutedWithKeyPressRef.current) {
        toggleMute(true);
      }

      micOnNotification.close();
      wasUnmutedWithKeyPressRef.current = false;
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

  console.log('isInCall', {viewMode: viewMode(), detachedWindow: detachedWindow(), activeWindow, callState});

  return isInCall && (isFullScreenView || isHighlightedDetatchedWindow);
};

/**
 * Subscribe to push-to-talk functionality.
 * @param key The key to listen to.
 * @param toggleMute A function to toggle the mute state.
 * @param isMuted A function to check if the user is muted.
 * @returns A function to unsubscribe.
 * @example
 * const unsubscribe = pushToTalk.subscribe(() => settings.getToggleKey(), toggleMute, isMuted);
 * unsubscribe();
 */
export const usePushToTalk = ({callState, toggleMute, isMuted, enabled}: PushToTalk) => {
  const wasUnmutedWithKeyPressRef = useRef(false);
  const micOnNotification = createAppNotification();
  const isInCallAndViewMode = checkUserInCallAndViewMode(callState);

  const {detachedWindow} = callState;
  const detatchedWindowElement = detachedWindow();

  useEffect(() => {
    // if (!enabled || !isInCallAndViewMode) {
    //   return undefined;
    // }

    let pressTimeout: NodeJS.Timeout | null = null;

    detatchedWindowElement?.addEventListener('keydown', event =>
      console.log('detatchedWindowElement keydown', event.key),
    );

    return handleKeyPress(' ', detatchedWindowElement, {
      onPress: () => {
        console.log('onPress');
        // If we are already unmuted, we do nothing.
        if (!isMuted()) {
          return;
        }

        pressTimeout = setTimeout(() => {
          micOnNotification.show('Microphone temporarily on');
          wasUnmutedWithKeyPressRef.current = true;
          toggleMute(false);
        }, 200);
      },
      onRelease: () => {
        if (pressTimeout) {
          clearTimeout(pressTimeout);
          pressTimeout = null;
        }

        // If we were unmuted with the key press, we mute again.
        // (This is to prevent muting when first unmuted with the unmute button)
        if (wasUnmutedWithKeyPressRef.current) {
          toggleMute(true);
        }

        micOnNotification.close();
        wasUnmutedWithKeyPressRef.current = false;
      },
    });
  }, [toggleMute, isMuted, enabled, micOnNotification, isInCallAndViewMode]);
};
