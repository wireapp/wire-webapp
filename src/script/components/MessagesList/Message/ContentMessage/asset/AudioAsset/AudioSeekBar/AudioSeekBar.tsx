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

import React, {useEffect, useRef, useState} from 'react';

import cx from 'classnames';

import {FileAsset} from 'Repositories/entity/message/FileAsset';
import {interpolate} from 'Util/ArrayUtil';
import {clamp} from 'Util/NumberUtil';
import {createUuid} from 'Util/uuid';

export interface AudioSeekBarProps {
  asset: FileAsset;
  audioElement: HTMLAudioElement;
  disabled: boolean;
}

const AudioSeekBar: React.FC<AudioSeekBarProps> = ({asset, audioElement, disabled}) => {
  const [svgWidth, setSvgWidth] = useState(0);
  const [path, setPath] = useState('');
  const [loudness, setLoudness] = useState<number[]>([]);
  const [position, setPosition] = useState(0);
  const svgNode = useRef<SVGSVGElement>(null);
  const [clipId] = useState(`clip-${createUuid()}`);

  useEffect(() => {
    window.addEventListener('resize', updateSvgWidth);
    return () => window.removeEventListener('resize', updateSvgWidth);
  }, []);

  useEffect(() => {
    const loudness = asset.meta?.loudness;

    if (loudness) {
      setLoudness(Array.from(loudness).map(level => level / 256));
    }
  }, [asset]);

  useEffect(() => {
    audioElement?.addEventListener('ended', onAudioEnded);
    audioElement?.addEventListener('timeupdate', onTimeUpdate);
    return () => {
      audioElement?.removeEventListener('ended', onAudioEnded);
      audioElement?.removeEventListener('timeupdate', onTimeUpdate);
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
    if (!svgNode.current) {
      return;
    }

    const mouse_x = (event.pageX ?? event.clientX) - svgNode.current.getBoundingClientRect().left;
    const calculatedTime = (audioElement.duration * mouse_x) / svgNode.current.clientWidth;
    const currentTime = isNaN(calculatedTime) ? 0 : calculatedTime;
    audioElement.currentTime = clamp(currentTime, 0, audioElement.duration);
    onTimeUpdate();
  };

  const onAudioEnded = () => setPosition(0);

  const onTimeUpdate = () => {
    if (audioElement.duration) {
      setPosition(audioElement.currentTime / audioElement.duration);
    }
  };

  return (
    <svg
      aria-hidden="true"
      className={cx('audio-seek-bar', {'element-disabled': disabled})}
      width="100%"
      height="100%"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      ref={svgNode}
      onClick={onLevelClick}
      data-uie-name="status-audio-seekbar"
    >
      <clipPath id={clipId}>
        <rect x={0} y={0} height={1} width={position} />
      </clipPath>
      <path d={path} />
      <path clipPath={`url(#${clipId})`} className="active" d={path} />
    </svg>
  );
};

export {AudioSeekBar};
