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

import {useState, useCallback, useRef, SyntheticEvent} from 'react';

import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {EventName} from 'src/script/tracking/EventName';

import {isVideoPlayable} from './isVideoPlayable/isVideoPlayable';

import {AssetUrl} from '../../useAssetTransfer';

interface UseVideoPlaybackProps {
  url: string;
  videoElement: HTMLVideoElement | undefined;
  enabled: boolean;
}

type PlayabilityStatus = 'not-checked' | 'playable' | 'unplayable';

export const useVideoPlayback = ({url, videoElement, enabled}: UseVideoPlaybackProps) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isError, setIsError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const isPlayedRef = useRef(false);
  const playabilityStatusRef = useRef<PlayabilityStatus>('not-checked');

  const handleTimeUpdate = useCallback(() => {
    if (!videoElement) {
      return;
    }
    setCurrentTime(videoElement.currentTime);
  }, [videoElement]);

  const getPlayabilityStatus = async (): Promise<PlayabilityStatus> => {
    const playable = await isVideoPlayable(url);

    if (!playable) {
      const status = 'unplayable';

      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.PLAY_FAILED);
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.UNPLAYABLE_ERROR);
      setIsError(true);
      playabilityStatusRef.current = status;
      return status;
    }

    const status = 'playable';

    playabilityStatusRef.current = status;
    return status;
  };

  const handlePlay = async (src?: AssetUrl): Promise<void> => {
    if (!enabled || !src || !videoElement) {
      return;
    }

    if (playabilityStatusRef.current !== 'not-checked') {
      isPlayedRef.current = true;
      setIsPlaying(true);
      await videoElement.play();
      return;
    }

    const playabilityStatus = await getPlayabilityStatus();

    if (playabilityStatus === 'unplayable') {
      return;
    }

    isPlayedRef.current = true;
    setIsPlaying(true);
    await videoElement.play();
  };

  const handlePause = useCallback((): void => {
    setIsPlaying(false);
    videoElement?.pause();
  }, [videoElement]);

  const handleError = useCallback((event: SyntheticEvent<HTMLVideoElement>) => {
    setIsError(true);
    amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.PLAY_FAILED);
    console.error('Video cannot be played', event);
  }, []);

  return {
    currentTime,
    isPlaying,
    isError,
    isPlayedRef,
    handleTimeUpdate,
    handlePlay,
    handlePause,
    handleError,
  };
};
