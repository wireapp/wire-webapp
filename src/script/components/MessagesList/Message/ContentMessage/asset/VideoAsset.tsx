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

import React, {useCallback, useEffect, useState} from 'react';

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';
import {amplify} from 'amplify';
import cx from 'classnames';
import {container} from 'tsyringe';

import {Button, ButtonVariant, useTimeout} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {RestrictedVideo} from 'Components/asset/RestrictedVideo';
import {EventName} from 'src/script/tracking/EventName';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {formatSeconds} from 'Util/TimeUtil';
import {useEffectRef} from 'Util/useEffectRef';

import {MediaButton} from './controls/MediaButton';
import {SeekBar} from './controls/SeekBar';
import {FileAsset} from './FileAssetComponent';
import {AssetUrl, useAssetTransfer} from './useAssetTransfer';

import {AssetRepository} from '../../../../../assets/AssetRepository';
import {AssetTransferState} from '../../../../../assets/AssetTransferState';
import type {ContentMessage} from '../../../../../entity/message/ContentMessage';
import type {FileAsset as FileAssetType} from '../../../../../entity/message/FileAsset';
import {TeamState} from '../../../../../team/TeamState';

interface VideoAssetProps {
  assetRepository?: AssetRepository;
  isQuote?: boolean;
  message: ContentMessage;
  teamState?: TeamState;
  isFocusable?: boolean;
}

const VideoAsset: React.FC<VideoAssetProps> = ({
  message,
  isQuote,
  teamState = container.resolve(TeamState),
  isFocusable = true,
}) => {
  const asset = message.getFirstAsset() as FileAssetType;
  const {isObfuscated} = useKoSubscribableChildren(message, ['isObfuscated']);
  const {preview_resource: assetPreviewResource} = useKoSubscribableChildren(asset, ['preview_resource']);
  const [videoPlaybackError, setVideoPlaybackError] = useState(false);
  const [videoTimeRest, setVideoTimeRest] = useState<number>(0);
  const [videoPreview, setVideoPreview] = useState<AssetUrl>();
  const [videoSrc, setVideoSrc] = useState<AssetUrl>();
  const [videoElement, setVideoElement] = useEffectRef<HTMLVideoElement>();
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  const {isFileSharingReceivingEnabled} = useKoSubscribableChildren(teamState, ['isFileSharingReceivingEnabled']);
  const [displaySmall, setDisplaySmall] = useState(!!isQuote);
  const {transferState, isUploading, isPendingUpload, uploadProgress, cancelUpload, getAssetUrl, downloadAsset} =
    useAssetTransfer(message);

  const [hideControls, setHideControls] = useState(false);
  const hideControlsCallback = useCallback(() => setHideControls(true), []);
  const {removeTimeout, startTimeout} = useTimeout(hideControlsCallback, 2000);

  useEffect(() => {
    if (assetPreviewResource && isFileSharingReceivingEnabled) {
      getAssetUrl(assetPreviewResource).then(setVideoPreview);
    }

    return () => {
      videoPreview?.dispose();
      videoSrc?.dispose();
    };
  }, []);

  // Initial check if video is supported with `canPlayType` method, which checks for MIME type, e.g. 'video/mp4' or 'video/mov'.
  // It's not 100% reliable (e.g. doesn't check codecs), but it's synchorous, which is helpful for initial rendering.
  const isVideoMimeTypeSupported = (mimeType: string): boolean => {
    const video = document.createElement('video');
    const canPlay = video.canPlayType(mimeType) !== '';

    if (!canPlay) {
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.PLAY_FAILED);
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.UNSUPPORTED_MIME_TYPE);
    }

    return canPlay;
  };

  // Advanced check for video playability.
  // It's more reliable than `isVideoMimeTypeSupported` (e.g. checks for codecs), but it's async, so it's not suitable for initial rendering.
  // It's used when user tries to play the video.
  const isVideoPlayable = async (url: string): Promise<boolean> => {
    const video = document.createElement('video');
    return new Promise<boolean>(resolve => {
      video.onloadedmetadata = () => resolve(true);
      video.onerror = () => resolve(false);
      video.src = url;
    });
  };

  const onPlayButtonClicked = async (): Promise<void> => {
    if (isFileSharingReceivingEnabled) {
      setDisplaySmall(false);

      if (videoSrc && videoElement) {
        videoElement.play();
      } else {
        asset.status(AssetTransferState.DOWNLOADING);

        try {
          const assetUrl = await getAssetUrl(asset.original_resource());
          const playable = await isVideoPlayable(assetUrl.url);

          if (!playable) {
            amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.PLAY_FAILED);
            amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.UNPLAYABLE_ERROR);
            setVideoPlaybackError(true);
            return;
          }

          setVideoSrc(assetUrl);
          setIsVideoLoaded(true);
          amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.PLAY_SUCCESS);
        } catch (error) {
          setVideoPlaybackError(true);
          amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.PLAY_FAILED);
          console.error('Failed to load video asset ', error);
        }

        asset.status(AssetTransferState.UPLOADED);
      }
    }
  };

  const onPauseButtonClicked = (): void => {
    videoElement?.pause();
  };

  const onVideoPlaying = (): void => {
    if (!videoElement) {
      return;
    }
    videoElement.style.backgroundColor = '#000';
  };

  useEffect(() => {
    if (videoSrc && videoElement) {
      const playPromise = videoElement.play();

      playPromise?.catch(error => {
        console.error('Failed to load video asset ', error);
      });
    }
  }, [videoElement, videoSrc]);

  const syncVideoTimeRest = () => {
    if (videoElement) {
      setVideoTimeRest(videoElement.duration - videoElement.currentTime);
    }
  };

  if (isObfuscated) {
    return null;
  }

  if (!isVideoMimeTypeSupported(asset.file_type || '')) {
    return <FileAsset message={message} isFocusable={isFocusable} />;
  }

  return (
    <div className="video-asset" data-uie-name="video-asset" data-uie-value={asset.file_name}>
      {!isFileSharingReceivingEnabled ? (
        <RestrictedVideo />
      ) : (
        <>
          <div
            className={cx('video-asset__container', {'video-asset__container--small': displaySmall})}
            onPointerLeave={startTimeout}
            onPointerEnter={() => {
              removeTimeout();
              setHideControls(false);
            }}
          >
            <video
              ref={setVideoElement}
              playsInline
              src={videoSrc?.url}
              poster={videoPreview?.url}
              onError={event => {
                setVideoPlaybackError(true);
                amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.PLAY_FAILED);
                console.error('Video cannot be played', event);
              }}
              onPlaying={onVideoPlaying}
              onTimeUpdate={syncVideoTimeRest}
              onLoadedMetadata={syncVideoTimeRest}
              className={cx({hidden: isUploading})}
              style={{backgroundColor: videoPreview ? '#000' : ''}}
              tabIndex={TabIndex.UNFOCUSABLE}
            />
            {videoPlaybackError ? (
              <div className="video-asset__playback-error">
                <p className="label-medium">{t('conversationPlaybackError')}</p>
                <Button variant={ButtonVariant.TERTIARY} onClick={() => downloadAsset(asset)}>
                  {t('conversationPlaybackErrorDownload')}
                </Button>
              </div>
            ) : (
              <>
                {isPendingUpload ? (
                  <div className="asset-placeholder loading-dots" />
                ) : (
                  <div
                    className={cx('video-asset__controls', {
                      'video-asset__controls--hidden': isVideoLoaded && hideControls,
                    })}
                  >
                    <div className="video-asset__controls-center">
                      <MediaButton
                        mediaElement={videoElement}
                        large={!displaySmall}
                        asset={asset}
                        play={onPlayButtonClicked}
                        pause={onPauseButtonClicked}
                        cancel={() => (isUploading ? cancelUpload() : asset.cancelDownload())}
                        transferState={transferState}
                        uploadProgress={uploadProgress}
                        isFocusable={isFocusable}
                      />
                    </div>

                    {isVideoLoaded && videoElement && (
                      <div className="video-asset__controls__bottom">
                        <SeekBar
                          className="video-asset__controls__bottom__seekbar"
                          data-uie-name="status-video-seekbar"
                          mediaElement={videoElement}
                          isFocusable={isFocusable}
                        />
                        <span
                          className="video-asset__controls__bottom__time label-xs"
                          data-uie-name="status-video-time"
                        >
                          {formatSeconds(videoTimeRest)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="video-asset__container__sizer"></div>
        </>
      )}
    </div>
  );
};

export {VideoAsset};
