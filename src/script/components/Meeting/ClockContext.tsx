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

import {createContext, PropsWithChildren, useEffect, useState} from 'react';

import {TIME_IN_MILLIS} from 'Util/TimeUtil';

/**
 * A lightweight context that updates once per second(cna be changed by providing tickMS from outside) with the current time (in ms).
 */
export const ClockContext = createContext<number>(Date.now());

export interface ClockProviderProps extends PropsWithChildren {
  tickMs?: number;
}

export const ClockProvider = ({children, tickMs = TIME_IN_MILLIS.SECOND}: ClockProviderProps) => {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  return <ClockContext.Provider value={now}>{children}</ClockContext.Provider>;
};
