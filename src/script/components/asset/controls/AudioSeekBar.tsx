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

import React, {useState, useEffect, useRef} from 'react';
import cx from 'classnames';

import {interpolate} from 'Util/ArrayUtil';
import {clamp} from 'Util/NumberUtil';
import {registerReactComponent} from 'Util/ComponentUtil';

import {FileAsset} from '../../../entity/message/FileAsset';

/**
 * A float that must be between 0 and 1
 */
type Fraction = number;

export interface AudioSeekBarProps {
  asset: FileAsset;
  audioElement: HTMLAudioElement;
  disabled: boolean;
}

const AudioSeekBar: React.FC<AudioSeekBarProps> = ({asset, audioElement, disabled}) => {
  const [svgWidth, setSvgWidth] = useState(0);
  const [path, setPath] = useState('');
  const [loudness, setLoudness] = useState<number[]>([]);
  const svgNode = useRef<SVGSVGElement>();

  useEffect(() => {
    window.addEventListener('resize', updateSvgWidth);
    return () => window.removeEventListener('resize', updateSvgWidth);
  }, []);

  useEffect(() => {
    if (asset.meta?.loudness !== null) {
      setLoudness(Array.from(asset.meta.loudness).map(level => level / 256));
    }
  }, [asset]);

  useEffect(() => {
    audioElement.addEventListener('ended', onAudioEnded);
    audioElement.addEventListener('timeupdate', onTimeUpdate);
    return () => {
      audioElement.removeEventListener('ended', onAudioEnded);
      audioElement.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [audioElement]);

  useEffect(() => updateSvgWidth(), [svgNode.current]);

  useEffect(() => {
    if (!svgWidth) {
      return setPath('');
    }

    const numberOfLevelsFitOnScreen = Math.floor(svgWidth / 3);
    const singleWidth = 1 / numberOfLevelsFitOnScreen;
    const barWidth = (singleWidth / 3) * 2;
    const scaledLoudness = interpolate(loudness, numberOfLevelsFitOnScreen);
    const newPath = scaledLoudness
      .map((loudness, index) => {
        const x = index * singleWidth;
        const y = 0.5 - loudness / 2;
        return `M${x},${y}h${barWidth}V${1 - y}H${x}z`;
      })
      .join('');
    setPath(newPath);
  }, [svgWidth]);

  const updateSvgWidth = () => setSvgWidth(svgNode.current?.clientWidth ?? 0);

  const onLevelClick = (event: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const mouse_x = event.pageX - svgNode.current.getBoundingClientRect().left;
    const calculatedTime = (audioElement.duration * mouse_x) / svgNode.current.clientWidth;
    const currentTime = isNaN(calculatedTime) ? 0 : calculatedTime;
    audioElement.currentTime = clamp(currentTime, 0, audioElement.duration);
    onTimeUpdate();
  };

  const onAudioEnded = () => updateSeekClip(0);

  const onTimeUpdate = () => {
    if (audioElement.duration) {
      updateSeekClip(audioElement.currentTime / audioElement.duration);
    }
  };

  const updateSeekClip = (position: Fraction) => {
    const percent = position * 100;
    svgNode.current.style.setProperty('--seek-bar-clip', `polygon(0 0, ${percent}% 0, ${percent}% 100%, 0 100%)`);
  };

  return (
    <svg
      className={cx({'element-disabled': disabled})}
      width="100%"
      height="100%"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      ref={svgNode}
      onClick={onLevelClick}
    >
      <path d={path} />
      <path className="active" d={path} />
    </svg>
  );
};

export default AudioSeekBar;

registerReactComponent('audio-seek-bar', {
  component: AudioSeekBar,
  template: '<div data-bind="react: {asset, disabled: ko.unwrap(disabled), audioElement: src}"></div>',
});
