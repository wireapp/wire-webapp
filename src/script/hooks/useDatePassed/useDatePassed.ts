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

import {useCallback, useEffect, useRef} from 'react';

import {TIME_IN_MILLIS} from 'Util/TimeUtil';

interface UseDatePassedProps {
  target: Date | null;
  callback: () => void;
  enabled?: boolean;
}

export const useDatePassed = ({target, callback, enabled = true}: UseDatePassedProps) => {
  const hasPassed = useRef(false);
  const intervalId = useRef<ReturnType<typeof setInterval>>();
  const targetTime = useRef<number | null>(null);

  const checkTime = useCallback(() => {
    if (!target || !enabled) {
      return;
    }

    const currentTime = Date.now();
    if (currentTime >= target.getTime()) {
      hasPassed.current = true;
      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
      callback();
    }
  }, [target, callback, enabled]);

  useEffect(() => {
    // Clear interval if disabled or no target
    if (!enabled || !target) {
      hasPassed.current = false;
      targetTime.current = null;
      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
      return undefined;
    }

    const newTargetTime = target.getTime();

    // Reset state when target changes
    if (newTargetTime !== targetTime.current) {
      hasPassed.current = false;
      targetTime.current = newTargetTime;

      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
    }

    const currentTime = Date.now();
    if (currentTime >= newTargetTime) {
      hasPassed.current = true;
      callback();
      return undefined;
    }

    intervalId.current = setInterval(checkTime, TIME_IN_MILLIS.SECOND);

    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
    };
  }, [checkTime, target, callback, enabled]);
};
