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

import {useRef, useEffect, useState} from 'react';

export const usePausableInterval = (callback: () => void, timer: number) => {
  const intervalIdRef = useRef<() => void>();
  const totalTimeRun = useRef(0);
  const intervalId = useRef<number>();
  const startTime = useRef(new Date().getTime());
  const [pause, setPause] = useState(true);

  const pauseInterval = () => setPause(true);
  const startInterval = () => setPause(false);
  const clearInterval = () => window.clearTimeout(intervalId.current);

  useEffect(() => {
    intervalIdRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const fn = () => {
      intervalIdRef.current();
    };

    if (timer !== null) {
      if (pause === false) {
        intervalId.current = window.setTimeout(function interval() {
          startTime.current = new Date().getTime();
          fn();
          intervalId.current = window.setTimeout(interval, timer);
        }, timer - totalTimeRun.current);
        totalTimeRun.current = 0;
      }
      if (pause === true) {
        totalTimeRun.current = new Date().getTime() - startTime.current;
        clearInterval();
      }
    }
  }, [timer, pause]);
  return {clearInterval, pauseInterval, startInterval};
};
