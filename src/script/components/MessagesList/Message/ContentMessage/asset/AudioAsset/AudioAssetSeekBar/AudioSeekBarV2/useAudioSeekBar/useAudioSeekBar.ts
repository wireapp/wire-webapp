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

import {MouseEvent, useCallback, useEffect, useMemo, useState} from 'react';

import {FileAsset} from 'Repositories/entity/message/FileAsset';
import {interpolate} from 'Util/ArrayUtil';
import {clamp} from 'Util/NumberUtil';

interface UseAudioSeekBarProps {
  asset: FileAsset;
  audioElement: HTMLAudioElement;
  svgRef: React.RefObject<SVGSVGElement>;
}

interface AudioState {
  svgWidth: number;
  position: number;
  loudness: number[];
}

const LEVELS_PER_WIDTH = 3;
const NORMALIZED_LOUDNESS = 256;

export const useAudioSeekBar = ({asset, audioElement, svgRef}: UseAudioSeekBarProps) => {
  const [{svgWidth, position, loudness}, setState] = useState<AudioState>({
    svgWidth: 0,
    position: 0,
    loudness: [],
  });

  const updateSvgWidth = useCallback(() => {
    setState(state => ({...state, svgWidth: svgRef.current?.clientWidth ?? 0}));
  }, [svgRef]);

  const onTimeUpdate = useCallback(() => {
    if (!audioElement?.duration) {
      return;
    }

    setState(state => ({
      ...state,
      position: audioElement.currentTime / audioElement.duration,
    }));
  }, [audioElement]);

  const onAudioEnded = useCallback(() => {
    setState(state => ({...state, position: 0}));
  }, []);

  const onLevelClick = useCallback(
    (event: MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || !audioElement?.duration) {
        return;
      }

      const mouseX = (event.pageX ?? event.clientX) - svgRef.current.getBoundingClientRect().left;
      const calculatedTime = (audioElement.duration * mouseX) / svgRef.current.clientWidth;
      const currentTime = isNaN(calculatedTime) ? 0 : calculatedTime;

      audioElement.currentTime = clamp(currentTime, 0, audioElement.duration);
      onTimeUpdate();
    },
    [audioElement, svgRef, onTimeUpdate],
  );

  const path = useMemo(() => {
    if (!svgWidth) {
      return '';
    }

    const numberOfLevelsFitOnScreen = Math.floor(svgWidth / LEVELS_PER_WIDTH);
    const singleWidth = 1 / numberOfLevelsFitOnScreen;
    const barWidth = (singleWidth / 3) * 2;
    const scaledLoudness = interpolate(loudness, numberOfLevelsFitOnScreen);

    return scaledLoudness
      .map((level, index) => {
        const x = index * singleWidth;
        const y = 0.5 - level / 2;
        return `M${x},${y}h${barWidth}V${1 - y}H${x}z`;
      })
      .join('');
  }, [svgWidth, loudness]);

  useEffect(() => {
    window.addEventListener('resize', updateSvgWidth);
    return () => window.removeEventListener('resize', updateSvgWidth);
  }, [updateSvgWidth]);

  useEffect(() => {
    const assetLoudness = asset.meta?.loudness;
    if (!assetLoudness) {
      return;
    }

    setState(state => ({
      ...state,
      loudness: Array.from(assetLoudness).map(level => level / NORMALIZED_LOUDNESS),
    }));
  }, [asset]);

  useEffect(() => {
    audioElement.addEventListener('ended', onAudioEnded);
    audioElement.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      audioElement.removeEventListener('ended', onAudioEnded);
      audioElement.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [audioElement, onAudioEnded, onTimeUpdate]);

  useEffect(() => {
    updateSvgWidth();
  }, [updateSvgWidth]);

  return {
    path,
    position,
    onLevelClick,
  };
};
