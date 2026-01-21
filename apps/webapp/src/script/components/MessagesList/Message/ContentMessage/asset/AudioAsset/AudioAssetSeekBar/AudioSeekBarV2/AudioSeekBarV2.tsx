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

import {useRef, useState} from 'react';

import {FileAsset} from 'Repositories/entity/message/FileAsset';
import {createUuid} from 'Util/uuid';

import {svgStyles, svgStylesDisabled} from './AudioSeekBar.styles';
import {useAudioSeekBar} from './useAudioSeekBar/useAudioSeekBar';

interface AudioSeekBarNewProps {
  asset: FileAsset;
  audioElement: HTMLAudioElement;
  disabled?: boolean;
}

export const AudioSeekBarNew = ({asset, audioElement, disabled = false}: AudioSeekBarNewProps) => {
  const svgNode = useRef<SVGSVGElement>(null);
  const [clipId] = useState(`clip-${createUuid()}`);

  const {path, position, onLevelClick} = useAudioSeekBar({
    asset,
    audioElement,
    svgRef: svgNode,
  });

  return (
    <svg
      aria-hidden="true"
      css={disabled ? svgStylesDisabled : svgStyles}
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
