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

import {useInView} from 'src/script/hooks/useInView/useInView';
import {useEffectRef} from 'Util/useEffectRef';

import {TabIndex} from '@wireapp/react-ui-kit';

import {useVideoPlayback} from './useVideoPlayback/useVideoPlayback';
import {VideoAssetCard} from './VideoAssetCard/VideoAssetCard';
import {VideoAssetError} from './VideoAssetError/VideoAssetError';
import {VideoAssetLoading} from './VideoAssetLoading/VideoAssetLoading';
import {wrapperStyles, videoStyles, controlsWrapperStyles} from './VideoAssetPlayer.styles';
import {VideoControls} from './VideoControls/VideoControls';
import {VideoPlayOverlay} from './VideoPlayOverlay/VideoPlayOverlay';

interface VideoAssetPlayerProps {
  url?: string;
  name: string;
  extension: string;
  size: string;
  isLoading: boolean;
  isError: boolean;
  isFocusable?: boolean;
  isFileShareRestricted: boolean;
  senderName: string;
  timestamp: number;
  id: string;
}

/**
 * Root margin for viewport visibility detection.
 * Controls when the video element is loaded based on viewport visibility.
 */
const VIDEO_ROOT_MARGIN = '0px';

export const VideoAssetPlayer = ({
  isFocusable = true,
  isFileShareRestricted,
  name,
  extension,
  size,
  url,
  isLoading,
  isError,
  senderName,
  timestamp,
  id,
}: VideoAssetPlayerProps) => {
  const [videoElement, setVideoElement] = useEffectRef<HTMLVideoElement>();

  const {elementRef: wrapperRef, isInView} = useInView({
    rootMargin: VIDEO_ROOT_MARGIN,
  });

  const isEnabled = !isFileShareRestricted && isInView;

  const {
    isPlaying,
    isPlayedRef,
    isError: isPlaybackError,
    handlePlay,
    handlePause,
    handleError,
    handleTimeUpdate,
  } = useVideoPlayback({
    url,
    videoElement,
    isEnabled,
  });

  if (isError || isFileShareRestricted || isPlaybackError) {
    return (
      <VideoAssetCard
        id={id}
        ref={wrapperRef}
        extension={extension}
        name={name}
        size={size}
        isError
        senderName={senderName}
        timestamp={timestamp}
      >
        <VideoAssetError isFileShareRestricted={isFileShareRestricted} />
      </VideoAssetCard>
    );
  }

  if (isLoading || !url) {
    return (
      <VideoAssetCard
        id={id}
        ref={wrapperRef}
        extension={extension}
        name={name}
        size={size}
        isLoading
        senderName={senderName}
        timestamp={timestamp}
      >
        <VideoAssetLoading />
      </VideoAssetCard>
    );
  }

  return (
    <VideoAssetCard
      id={id}
      src={url}
      ref={wrapperRef}
      extension={extension}
      name={name}
      size={size}
      senderName={senderName}
      timestamp={timestamp}
    >
      <div css={wrapperStyles}>
        <video
          ref={setVideoElement}
          src={url}
          preload="metadata"
          css={videoStyles}
          playsInline
          onError={handleError}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleTimeUpdate}
          tabIndex={TabIndex.UNFOCUSABLE}
        />
        <div css={controlsWrapperStyles}>
          {!isPlayedRef.current && (
            <VideoPlayOverlay
              isPlaying={isPlaying}
              videoElement={videoElement}
              handlePlay={handlePlay}
              handlePause={handlePause}
              isFocusable={isFocusable}
            />
          )}
          {videoElement && isPlayedRef.current && (
            <VideoControls
              isPlaying={isPlaying}
              videoElement={videoElement}
              handlePlay={handlePlay}
              handlePause={handlePause}
              isFocusable={isFocusable}
            />
          )}
        </div>
      </div>
    </VideoAssetCard>
  );
};
