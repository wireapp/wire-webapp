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

const defaultKey = ' '; // spacebar;

const subscribe = (key = defaultKey, toggleMute: (shouldMute: boolean) => void, isMuted: () => boolean) => {
  let isKeyDown = false;
  let wasUnmutedWithKeyPress = false;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (isKeyDown) {
      return;
    }

    isKeyDown = event.key === key;

    // If we are already unmuted, we do nothing
    if (!isMuted()) {
      return;
    }

    if (!isKeyDown) {
      return;
    }

    wasUnmutedWithKeyPress = true;

    toggleMute(false);
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    // If the key was not pressed, we do nothing
    if (!isKeyDown) {
      return;
    }

    if (event.key === key) {
      isKeyDown = false;
    }

    if (wasUnmutedWithKeyPress) {
      toggleMute(true);
    }

    wasUnmutedWithKeyPress = false;
  };

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
  };
};

export const pushToTalk = {
  subscribe,
};
