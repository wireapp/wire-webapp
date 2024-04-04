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

import {useEffect, useRef, useState} from 'react';

import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {handleKeyPress} from 'Util/KeyboardUtil';

interface PushToTalk {
  key: string | null;
  toggleMute: (shouldMute: boolean) => void;
  isMuted: () => boolean;
  wasUnmutedWithKeyPressRef: React.MutableRefObject<boolean>;
}

const subscribeToKeyPress = ({key, toggleMute, isMuted, wasUnmutedWithKeyPressRef}: PushToTalk & {key: string}) => {
  return handleKeyPress(key, {
    onPress: () => {
      // If we are already unmuted, we do nothing.
      if (!isMuted()) {
        return;
      }

      wasUnmutedWithKeyPressRef.current = true;
      toggleMute(false);
    },
    onRelease: () => {
      // If we were unmuted with the key press, we mute again.
      // (This is to prevent muting when first unmuted with the unmute button)
      if (wasUnmutedWithKeyPressRef.current) {
        toggleMute(true);
      }

      wasUnmutedWithKeyPressRef.current = false;
    },
  });
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
export const usePushToTalk = ({key: initialKey, toggleMute, isMuted}: PushToTalk) => {
  const [key, setKey] = useState<string | null>(initialKey);
  const wasUnmutedWithKeyPressRef = useRef(false);

  useEffect(() => {
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.CALL.PUSH_TO_TALK_KEY, setKey);
    return () => amplify.unsubscribe(WebAppEvents.PROPERTIES.UPDATE.CALL.PUSH_TO_TALK_KEY, setKey);
  }, []);

  useEffect(() => {
    if (!key) {
      return () => {};
    }

    return subscribeToKeyPress({key, toggleMute, isMuted, wasUnmutedWithKeyPressRef});
  }, [key, toggleMute, isMuted]);
};
