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

import cx from 'classnames';
import React, {CSSProperties, useEffect, useRef, useState} from 'react';
import {registerReactComponent} from 'Util/ComponentUtil';
import {clamp} from 'Util/NumberUtil';

export interface SeekBarProps {
  dark?: boolean;
  disabled?: boolean;
  src: HTMLMediaElement;
}

export interface SeekBarCSS extends CSSProperties {
  '--seek-bar-progress': string;
}

const SeekBar: React.FC<SeekBarProps> = ({dark: darkMode, disabled, src: mediaElement}: SeekBarProps) => {
  const seekBar = useRef<HTMLInputElement>();

  const [isSeekBarMouseOver, setIsSeekBarMouseOver] = useState<boolean>(false);
  const [isSeekBarThumbDragged, setIsSeekBarThumbDragged] = useState<boolean>(false);
  const [showSeekBarThumb, setShowSeekBarThumb] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    setShowSeekBarThumb(isSeekBarThumbDragged || isSeekBarMouseOver);
  }, [isSeekBarThumbDragged, isSeekBarMouseOver]);

  useEffect(() => {
    const onTimeUpdate = () => {
      if (mediaElement.currentTime > mediaElement.duration) {
        mediaElement.currentTime = mediaElement.duration;
      }
      const value = (100 / mediaElement.duration) * mediaElement.currentTime;
      setProgress(value);
    };

    const onEnded = () => {
      setProgress(100);
    };

    mediaElement.addEventListener('timeupdate', onTimeUpdate);
    mediaElement.addEventListener('ended', onEnded);

    return () => {
      mediaElement.removeEventListener('timeupdate', onTimeUpdate);
      mediaElement.removeEventListener('ended', onEnded);
    };
  }, [mediaElement]);

  return (
    <input
      data-uie-name="asset-control-media-seek-bar"
      className={cx({
        'element-disabled': disabled,
        'seek-bar--dark': darkMode,
        'show-seek-bar-thumb': showSeekBarThumb,
      })}
      max="100"
      onChange={() => {
        const currentTime = mediaElement.duration * (parseInt(seekBar.current.value, 10) / 100);
        mediaElement.currentTime = clamp(currentTime, 0, mediaElement.duration);
      }}
      onMouseDown={() => {
        mediaElement.pause();
        setIsSeekBarThumbDragged(true);
      }}
      onMouseUp={() => {
        mediaElement.play();
        setIsSeekBarThumbDragged(false);
      }}
      onMouseEnter={() => setIsSeekBarMouseOver(true)}
      onMouseLeave={() => setIsSeekBarMouseOver(false)}
      style={
        {
          '--seek-bar-progress': `${progress.toString(10)}%`,
        } as SeekBarCSS
      }
      type="range"
      value="0"
    />
  );
};

export default SeekBar;

registerReactComponent('seek-bar', {
  component: SeekBar,
  optionalParams: ['dark', 'disabled'],
  template: '<div data-bind="react: {dark, disabled: ko.unwrap(disabled), src}"></div>',
});
