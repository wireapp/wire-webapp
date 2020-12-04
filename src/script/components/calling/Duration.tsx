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
