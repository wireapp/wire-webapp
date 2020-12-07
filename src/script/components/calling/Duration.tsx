/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import React, {useState, useEffect} from 'react';
import {formatSeconds} from 'Util/TimeUtil';

export interface DurationProps {
  startedAt?: number;
}

const Duration: React.FC<DurationProps> = ({startedAt}) => {
  const [duration, setDuration] = useState('');

  useEffect(() => {
    let durationUpdateInterval: number;
    if (startedAt) {
      const updateTimer = () => {
        const time = Math.floor((Date.now() - startedAt) / 1000);
        setDuration(formatSeconds(time));
      };
      updateTimer();
      durationUpdateInterval = window.setInterval(updateTimer, 1000);
    }
    return () => {
      window.clearInterval(durationUpdateInterval);
    };
  }, [startedAt]);

  return <React.Fragment>{duration}</React.Fragment>;
};

export default Duration;
