/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {isNullOrUndefined} from '@sindresorhus/is';

type TimeoutControls = {
  removeTimeout: () => void;
  startTimeout: () => void;
};

const useTimeout = (onTimeoutStop: () => void, duration: number): TimeoutControls => {
  const timerRef = useRef<number | null>(null);

  const removeTimeout = (): void => {
    if (!isNullOrUndefined(timerRef.current)) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const start = (): void => {
    removeTimeout();
    timerRef.current = window.setTimeout(onStop, duration);
  };

  const onStop = (): void => {
    removeTimeout();
    onTimeoutStop();
  };

  useEffect(() => {
    return () => {
      removeTimeout();
    };
  }, [duration, onTimeoutStop]);

  return {removeTimeout, startTimeout: start};
};

export {useTimeout};
