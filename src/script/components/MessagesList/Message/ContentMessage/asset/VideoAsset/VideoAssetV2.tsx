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

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';
import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import type {ContentMessage} from 'src/script/entity/message/ContentMessage';
import type {FileAsset as FileAssetType} from 'src/script/entity/message/FileAsset';
import {useInView} from 'src/script/hooks/useInView/useInView';
import {EventName} from 'src/script/tracking/EventName';
import {useEffectRef} from 'Util/useEffectRef';

import {getVideoMetadata} from './getVideoMetadata/getVideoMetadata';
import {isVideoMimeTypeSupported} from './isVideoMimeTypeSupported/isVideoMimeTypeSupported';
import {useVideoPlayback} from './useVideoPlayback/useVideoPlayback';
import {VideoAssetCard} from './VideoAssetCard/VideoAssetCard';
import {VideoAssetError} from './VideoAssetError/VideoAssetError';
import {VideoAssetLoading} from './VideoAssetLoading/VideoAssetLoading';
import {wrapperStyles, videoStyles, controlsWrapperStyles} from './VideoAssetV2.styles';
import {VideoControls} from './VideoControls/VideoControls';
import {VideoPlayOverlay} from './VideoPlayOverlay/VideoPlayOverlay';

import {useAssetTransfer} from '../common/useAssetTransfer/useAssetTransfer';
import {useGetAssetUrl} from '../common/useGetAssetUrl/useGetAssetUrl';
import {FileAssetV2} from '../FileAsset/FileAssetV2';

interface VideoAssetProps {
  message: ContentMessage;
  isFocusable?: boolean;
  isFileShareRestricted: boolean;
}

/**
 * Root margin for viewport visibility detection.
 * Controls when the video element is loaded based on viewport visibility.
 */
const VIDEO_ROOT_MARGIN = '0px';

export const VideoAssetV2 = ({message, isFocusable = true, isFileShareRestricted}: VideoAssetProps) => {
  const asset = message.getFirstAsset() as FileAssetType;

  const [videoElement, setVideoElement] = useEffectRef<HTMLVideoElement>();

  const {elementRef: wrapperRef, isInView} = useInView({
    rootMargin: VIDEO_ROOT_MARGIN,
  });

  const {transferState, isPendingUpload, uploadProgress, cancelUpload, getAssetUrl} = useAssetTransfer(message);

  const isEnabled = !isFileShareRestricted && isInView;

  const {
    url,
    isError: isApiError,
    isLoading,
  } = useGetAssetUrl({
    asset,
    isEnabled,
    getAssetUrl,
    onSuccess: () => {
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.PLAY_SUCCESS);
    },
    onError: () => {
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.PLAY_FAILED);
    },
  });

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

  const {name, extension, size, type} = getVideoMetadata({asset});

  const isError = isApiError || isPlaybackError;

  if (!isVideoMimeTypeSupported(type)) {
    return <FileAssetV2 message={message} isFileShareRestricted={isFileShareRestricted} />;
  }

  if (isPendingUpload || isLoading) {
    return (
      <VideoAssetCard
        ref={wrapperRef}
        extension={extension}
        name={name}
        size={size}
        isLoading
        loadingProgress={uploadProgress}
      >
        <VideoAssetLoading />
      </VideoAssetCard>
    );
  }

  if (isError || isFileShareRestricted) {
    return (
      <VideoAssetCard ref={wrapperRef} extension={extension} name={name} size={size} isError>
        <VideoAssetError isFileShareRestricted={isFileShareRestricted} />
      </VideoAssetCard>
    );
  }

  return (
    <VideoAssetCard ref={wrapperRef} extension={extension} name={name} size={size}>
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
              handleCancelUpload={cancelUpload}
              handleCancelDownload={asset.cancelDownload}
              transferState={transferState}
              isFocusable={isFocusable}
            />
          )}
          {videoElement && isPlayedRef.current && (
            <VideoControls
              isPlaying={isPlaying}
              videoElement={videoElement}
              handlePlay={handlePlay}
              handlePause={handlePause}
              transferState={transferState}
              isFocusable={isFocusable}
            />
          )}
        </div>
      </div>
    </VideoAssetCard>
  );
};
