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

import {handleKeyPress} from 'Util/KeyboardUtil';

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
const subscribe = (key: string, toggleMute: (shouldMute: boolean) => void, isMuted: () => boolean) => {
  let wasUnmutedWithKeyPress = false;

  return handleKeyPress(key, {
    onPress: () => {
      // If we are already unmuted, we do nothing.
      if (!isMuted()) {
        return;
      }

      wasUnmutedWithKeyPress = true;
      toggleMute(false);
    },
    onRelease: () => {
      // If we were unmuted with the key press, we mute again.
      // (This is to prevent muting when first unmuted with the unmute button)
      if (wasUnmutedWithKeyPress) {
        toggleMute(true);
      }

      wasUnmutedWithKeyPress = false;
    },
  });
};

export const pushToTalk = {
  subscribe,
};
