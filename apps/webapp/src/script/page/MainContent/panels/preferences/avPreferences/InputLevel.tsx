/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {HTMLProps, useEffect, useRef, useState} from 'react';

import cx from 'classnames';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

export interface InputLevelProps extends HTMLProps<HTMLDivElement> {
  disabled: boolean;
  mediaStream: MediaStream | null;
}

/** How many bullets should be displayed */
export const MAX_AUDIO_BULLETS = 20;
const AUDIO_METER = {
  FFT_SIZE: 128,
  INTERVAL: 100,
  SMOOTHING_TIME_CONSTANT: 0.2,
};

const logger = getLogger('InputLevel');

/**
 * Shows bullet indicators to visualize the audio input level.
 *
 * @param disabled Show audio meter with disabled bullets if set to `true`
 * @param level Audio input volume as floating point number, `1.0` is 100%
 */
const InputLevel = ({disabled, mediaStream, className = '', ...rest}: InputLevelProps) => {
  const bullets = useRef(Array.from(Array(MAX_AUDIO_BULLETS).keys()));
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!mediaStream) {
      return undefined;
    }
    logger.info(`Initiating new audio meter for stream ID "${mediaStream.id}"`);
    if (!window.AudioContext?.prototype.createMediaStreamSource) {
      logger.warn('AudioContext is not supported, no volume indicator can be generated');
    }
    const audioContext = new window.AudioContext();

    const audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = AUDIO_METER.FFT_SIZE;
    audioAnalyser.smoothingTimeConstant = AUDIO_METER.SMOOTHING_TIME_CONSTANT;

    const audioDataArray = new Uint8Array(audioAnalyser.frequencyBinCount);

    const audioInterval = window.setInterval(() => {
      audioAnalyser.getByteFrequencyData(audioDataArray);
      const volume = audioDataArray.reduce((acc, curr) => acc + curr, 0);
      const averageVolume = volume / 160 / audioDataArray.length;
      setLevel(averageVolume);
    }, AUDIO_METER.INTERVAL);

    const audioSource = audioContext.createMediaStreamSource(mediaStream);
    audioSource.connect(audioAnalyser);
    return () => {
      window.clearInterval(audioInterval);
      audioContext
        ?.close()
        .then(() => logger.info('Closed existing AudioContext', audioContext))
        .catch(error => logger.error(error));

      audioSource?.disconnect();
      setLevel(0);
    };
  }, [mediaStream]);

  return (
    <div
      aria-label={level > 0 ? t('preferencesOptionsInputLevelDetected') : t('preferencesOptionsInputLevelNotDetected')}
      className={`input-level ${className}`}
      {...rest}
    >
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

export {InputLevel};
