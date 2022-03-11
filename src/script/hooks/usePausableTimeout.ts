/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {useRef, useEffect} from 'react';

export const usePausableTimeout = (callback: () => void, timer: number) => {
  const totalTimeRun = useRef<number>(0);
  const timeoutId = useRef<number>();
  const startTime = useRef<number>(new Date().getTime());

  const removeTimeout = () => {
    window.clearTimeout(timeoutId.current);
  };

  const start = () => {
    startTime.current = new Date().getTime();
    timeoutId.current = window.setTimeout(callback, timer - totalTimeRun.current);
  };

  const pause = () => {
    totalTimeRun.current = new Date().getTime() - startTime.current + totalTimeRun.current;
    removeTimeout();
  };

  useEffect(() => {
    return () => {
      removeTimeout();
    };
  }, [timer, callback]);

  return {pause, removeTimeout, start};
};
