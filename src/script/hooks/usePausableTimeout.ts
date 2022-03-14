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

export const usePausableTimeout = (callback: () => void, timer: number) => {
  const timeoutIdRef = useRef<() => void>();
  const totalTimeRun = useRef<number>(0);
  const timeoutId = useRef<number>();
  const startTime = useRef<number>(new Date().getTime());
  const [pause, setPause] = useState(true);

  const pauseTimeout = () => setPause(true);
  const startTimeout = () => setPause(false);
  const clearTimeout = () => window.clearTimeout(timeoutId.current);

  useEffect(() => {
    timeoutIdRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const fn = () => {
      timeoutIdRef.current();
    };

    if (timer !== null) {
      if (pause == false) {
        startTime.current = new Date().getTime();
        timeoutId.current = window.setTimeout(fn, timer - totalTimeRun.current);
      }
      if (pause === true) {
        totalTimeRun.current = new Date().getTime() - startTime.current + totalTimeRun.current;
        clearTimeout();
      }
    }
  }, [timer, pause]);
  return {clearTimeout, pauseTimeout, startTimeout};
};
