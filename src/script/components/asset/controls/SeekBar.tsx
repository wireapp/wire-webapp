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

import ko from 'knockout';
import cx from 'classnames';
import React, {useEffect, useRef, useState} from 'react';
import {registerReactComponent} from 'Util/ComponentUtil';
import {clamp} from 'Util/NumberUtil';

export interface SeekBarProps {
  dark: boolean;
  disabled: ko.Subscribable<boolean>;
  /** Media source */
  src: HTMLMediaElement;
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
      className={cx('legal-hold-dot', {
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
        } as React.CSSProperties
      }
      type="range"
      value="0"
    />
  );
};

export default SeekBar;

registerReactComponent('seek-bar', {
  component: SeekBar,
  optionalParams: [],
  template: '<div data-bind="react: {dark, disabled: ko.unwrap(disabled), src}"></div>',
});
