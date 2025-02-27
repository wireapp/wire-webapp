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

import {KEY} from 'Util/KeyboardUtil';

interface KeyPressAndHoldParams {
  key: (typeof KEY)[keyof typeof KEY];
  onHold: () => boolean;
  onRelease: () => void;
  holdDelayMs: number;
  enabled?: boolean;
  activeWindow?: Window;
}

export const useKeyPressAndHold = ({
  key,
  onHold,
  onRelease,
  holdDelayMs,
  enabled = true,
  activeWindow = window,
}: KeyPressAndHoldParams) => {
  const hasTriggeredRef = useRef(false);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isKeyDownRef = useRef(false);
  const isPressHandledRef = useRef(false);

  const handlePress = useCallback(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
    }

    holdTimeoutRef.current = setTimeout(() => {
      if (hasTriggeredRef.current) {
        return;
      }

      const called = onHold();
      hasTriggeredRef.current = true;
      isPressHandledRef.current = called;
    }, holdDelayMs);
  }, [onHold, holdDelayMs]);

  const clearHoldTimeout = useCallback(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  }, []);

  const handleRelease = useCallback(() => {
    clearHoldTimeout();
    hasTriggeredRef.current = false;

    if (!isPressHandledRef.current) {
      return;
    }

    onRelease();
    isPressHandledRef.current = false;
  }, [onRelease, clearHoldTimeout]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== key || isKeyDownRef.current) {
        return;
      }

      isKeyDownRef.current = true;
      handlePress();
    },
    [handlePress, key],
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== key || !isKeyDownRef.current) {
        return;
      }

      isKeyDownRef.current = false;
      handleRelease();
    },
    [handleRelease, key],
  );

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    activeWindow.addEventListener('keydown', handleKeyDown, true);
    activeWindow.addEventListener('keyup', handleKeyUp, true);

    return () => {
      clearHoldTimeout();
      activeWindow.removeEventListener('keydown', handleKeyDown, true);
      activeWindow.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [activeWindow, enabled, handleKeyDown, handleKeyUp, clearHoldTimeout]);
};
