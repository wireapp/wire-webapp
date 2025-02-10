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

import {useState, useCallback, useEffect, SyntheticEvent, useRef} from 'react';

import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {AssetError} from 'src/script/assets/AssetError';
import {AssetTransferState} from 'src/script/assets/AssetTransferState';
import type {FileAsset} from 'src/script/entity/message/FileAsset';
import {EventName} from 'src/script/tracking/EventName';

import {isVideoPlayable} from './isVideoPlayable/isVideoPlayable';

import {AssetUrl} from '../../useAssetTransfer';

interface UseVideoPlaybackProps {
  asset: FileAsset;
  videoElement: HTMLVideoElement | undefined;
  enabled: boolean;
  getAssetUrl: (resource: any) => Promise<AssetUrl>;
}

export const useVideoPlayback = ({asset, videoElement, enabled, getAssetUrl}: UseVideoPlaybackProps) => {
  const [src, setSrc] = useState<AssetUrl>();
  const [isError, setIsError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const isPlayedRef = useRef(false);

  const fetchAssetUrl = useCallback(async () => {
    if (src || !enabled) {
      return;
    }

    asset.status(AssetTransferState.DOWNLOADING);

    try {
      const assetUrl = await getAssetUrl(asset.original_resource());
      const playable = await isVideoPlayable(assetUrl.url);

      if (!playable) {
        amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.PLAY_FAILED);
        amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.UNPLAYABLE_ERROR);
        setIsError(true);
        return;
      }

      setSrc(assetUrl);
      setIsLoaded(true);
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.PLAY_SUCCESS);
    } catch (error) {
      if (error instanceof Error && error.name !== AssetError.CANCEL_ERROR) {
        setIsError(true);
      }
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.PLAY_FAILED);
      console.error('Failed to load video asset ', error);
    }

    asset.status(AssetTransferState.UPLOADED);
  }, [asset, enabled, getAssetUrl, src]);

  useEffect(() => {
    void fetchAssetUrl();
  }, [fetchAssetUrl]);

  const handleTimeUpdate = useCallback(() => {
    if (!videoElement) {
      return;
    }
    setCurrentTime(videoElement.currentTime);
  }, [videoElement]);

  const handlePlay = async (src?: AssetUrl): Promise<void> => {
    if (!enabled) {
      return;
    }

    if (src && videoElement) {
      void videoElement.play();
    }

    isPlayedRef.current = true;
  };

  const handlePause = useCallback((): void => {
    videoElement?.pause();
  }, [videoElement]);

  const handleError = useCallback((event: SyntheticEvent<HTMLVideoElement>) => {
    setIsError(true);
    amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.PLAY_FAILED);
    console.error('Video cannot be played', event);
  }, []);

  return {
    src,
    currentTime,
    isError,
    isLoaded,
    isPlayedRef,
    handleTimeUpdate,
    handlePlay,
    handlePause,
    handleError,
  };
};
