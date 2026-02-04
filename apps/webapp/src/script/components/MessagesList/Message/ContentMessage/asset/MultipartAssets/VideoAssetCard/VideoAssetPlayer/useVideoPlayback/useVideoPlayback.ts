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

import {getLogger} from 'Util/Logger';

import {isVideoPlayable} from './isVideoPlayable/isVideoPlayable';

const logger = getLogger('useVideoPlayback');

interface UseVideoPlaybackProps {
  url?: string;
  videoElement: HTMLVideoElement | undefined;
  isEnabled: boolean;
}

type PlayabilityStatus = 'not-checked' | 'playable' | 'unplayable';

export const useVideoPlayback = ({url, videoElement, isEnabled}: UseVideoPlaybackProps) => {
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

  const getPlayabilityStatus = useCallback(async (url?: string): Promise<PlayabilityStatus> => {
    if (!url) {
      return 'unplayable';
    }

    const playable = await isVideoPlayable(url);

    if (!playable) {
      const status = 'unplayable';

      // Todo: This needs to be revisited
      // amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.PLAY_FAILED);
      // amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.UNPLAYABLE_ERROR);
      setIsError(true);
      playabilityStatusRef.current = status;
      return status;
    }

    const status = 'playable';

    playabilityStatusRef.current = status;
    return status;
  }, []);

  const play = useCallback(async () => {
    if (!videoElement) {
      return;
    }

    isPlayedRef.current = true;
    setIsPlaying(true);
    await videoElement.play();
  }, [videoElement]);

  const handlePlay = useCallback(async (): Promise<void> => {
    if (!isEnabled || !url || !videoElement) {
      return;
    }

    if (playabilityStatusRef.current !== 'not-checked') {
      await play();
      return;
    }

    const playabilityStatus = await getPlayabilityStatus(url);

    if (playabilityStatus === 'unplayable') {
      return;
    }

    await play();
  }, [getPlayabilityStatus, isEnabled, play, url, videoElement]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    videoElement?.pause();
  }, [videoElement]);

  const handleError = useCallback((event: SyntheticEvent<HTMLVideoElement>) => {
    setIsError(true);
    // Todo: This needs to be revisited
    //amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.PLAY_FAILED);
    logger.development.error('Video cannot be played', new Error('Video playback error'), {event: event.type});
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
