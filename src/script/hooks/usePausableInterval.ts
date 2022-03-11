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

import {useRef} from 'react';

export const usePausableInterval = (callback: () => void, timer: number) => {
  const totalTimeRun = useRef(0);
  const intervalId = useRef<number>();
  const startTime = useRef(new Date().getTime());

  const removeInterval = () => {
    window.clearTimeout(intervalId.current);
  };

  const start = () => {
    intervalId.current = window.setTimeout(function interval() {
      startTime.current = new Date().getTime();
      callback();
      intervalId.current = window.setTimeout(interval, timer);
    }, timer - totalTimeRun.current);
    totalTimeRun.current = 0;
  };

  const pause = () => {
    totalTimeRun.current = new Date().getTime() - startTime.current;
    removeInterval();
  };

  return {pause, removeInterval, start};
};
