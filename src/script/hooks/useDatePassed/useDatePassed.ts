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
  onPassed: () => void;
}

export const useDatePassed = ({target, onPassed}: UseDatePassedProps) => {
  const hasPassed = useRef(false);
  const intervalId = useRef<ReturnType<typeof setInterval>>();
  const targetTime = useRef(target?.getTime());

  const checkTime = useCallback(() => {
    if (!target) {
      return;
    }

    const currentTime = Date.now();
    if (currentTime >= target.getTime()) {
      hasPassed.current = true;
      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
      onPassed();
    }
  }, [target, onPassed]);

  useEffect(() => {
    if (!target) {
      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
      return;
    }

    // Reset hasPassed if target changes
    if (target.getTime() !== targetTime.current) {
      hasPassed.current = false;
      targetTime.current = target.getTime();
    }

    if (hasPassed.current) {
      return;
    }

    if (intervalId.current) {
      clearInterval(intervalId.current);
    }

    intervalId.current = setInterval(checkTime, TIME_IN_MILLIS.SECOND);

    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
    };
  }, [checkTime, target]);
};
