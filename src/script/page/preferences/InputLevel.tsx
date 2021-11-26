/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import React, {useEffect, useRef} from 'react';
import cx from 'classnames';
import {registerReactComponent} from 'Util/ComponentUtil';
import {getLogger} from 'Util/Logger';

export interface InputLevelProps extends React.HTMLProps<HTMLDivElement> {
  disabled: boolean;
  mediaStream: MediaStream;
}

/** How many bullets should be displayed */
export const MAX_AUDIO_BULLETS = 20;
const AUDIO_METER = {
  FFT_SIZE: 1024,
  INTERVAL: 100,
  LEVEL_ADJUSTMENT: 0.075,
  SMOOTHING_TIME_CONSTANT: 0.2,
};

const logger = getLogger('InputLevel');

/**
 * Shows bullet indicators to visualize the audio input level.
 *
 * @param disabled Show audio meter with disabled bullets if set to `true`
 * @param level Audio input volume as floating point number, `1.0` is 100%
 */
const InputLevel: React.FC<InputLevelProps> = ({disabled, mediaStream, ...rest}) => {
  const bullets = useRef(Array.from(Array(MAX_AUDIO_BULLETS).keys()));
  const [level, setLevel] = React.useState(0);

  useEffect(() => {
    logger.info(`Initiating new audio meter for stream ID "${mediaStream.id}"`, mediaStream);
    if (!window.AudioContext?.prototype.createMediaStreamSource) {
      logger.warn('AudioContext is not supported, no volume indicator can be generated');
    }
    const audioContext = new window.AudioContext();

    const audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = AUDIO_METER.FFT_SIZE;
    audioAnalyser.smoothingTimeConstant = AUDIO_METER.SMOOTHING_TIME_CONSTANT;

    const audioDataArray = new Float32Array(audioAnalyser.frequencyBinCount);

    const audioInterval = window.setInterval(() => {
      audioAnalyser.getFloatFrequencyData(audioDataArray);
      const volume = audioDataArray.reduce((acc, curr) => acc + Math.abs(Math.max(curr, -100) + 100) / 50, 0);

      // Data is in the db range of -100 to -30, but can also be -Infinity. We normalize the value up to -50 to the range of 0, 1.

      const averageVolume = volume / audioDataArray.length;

      setLevel(averageVolume - AUDIO_METER.LEVEL_ADJUSTMENT);
    }, AUDIO_METER.INTERVAL);

    const audioSource = audioContext.createMediaStreamSource(mediaStream);
    audioSource.connect(audioAnalyser);
  }, [mediaStream]);

  return (
    <div className="input-level" {...rest}>
      {bullets.current.map(bulletIndex => (
        <div
          key={bulletIndex}
          className={cx('input-level__bullet', {
            'input-level__bullet--active': !disabled && level > bulletIndex / MAX_AUDIO_BULLETS,
            'input-level__bullet--disabled': disabled,
          })}
        />
      ))}
    </div>
  );
};

export default InputLevel;

registerReactComponent('input-level', {
  component: InputLevel,
  template: '<div data-bind="react: {disabled: ko.unwrap(disabled), level: ko.unwrap(level)}"></div>',
});
