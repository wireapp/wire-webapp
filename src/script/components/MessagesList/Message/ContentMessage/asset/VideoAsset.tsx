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
import cx from 'classnames';
import {container} from 'tsyringe';

import {useTimeout} from '@wireapp/react-ui-kit';

import {RestrictedVideo} from 'Components/asset/RestrictedVideo';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {formatSeconds} from 'Util/TimeUtil';
import {useEffectRef} from 'Util/useEffectRef';

import {useAssetTransfer} from './AbstractAssetTransferStateTracker';
import {MediaButton} from './controls/MediaButton';
import {SeekBar} from './controls/SeekBar';

import {AssetRepository} from '../../../../../assets/AssetRepository';
import {AssetTransferState} from '../../../../../assets/AssetTransferState';
import type {ContentMessage} from '../../../../../entity/message/ContentMessage';
import type {FileAsset} from '../../../../../entity/message/FileAsset';
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
  assetRepository = container.resolve(AssetRepository),
  isFocusable = true,
}) => {
  const asset = message.getFirstAsset() as FileAsset;
  const {isObfuscated} = useKoSubscribableChildren(message, ['isObfuscated']);
  const {preview_resource: assetPreviewResource} = useKoSubscribableChildren(asset, ['preview_resource']);
  const [videoPlaybackError, setVideoPlaybackError] = useState(false);
  const [videoTimeRest, setVideoTimeRest] = useState<number>(0);
  const [videoPreview, setVideoPreview] = useState<string>();
  const [videoSrc, setVideoSrc] = useState<string>();
  const [videoElement, setVideoElement] = useEffectRef<HTMLVideoElement>();
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const {isFileSharingReceivingEnabled} = useKoSubscribableChildren(teamState, ['isFileSharingReceivingEnabled']);
  const [displaySmall, setDisplaySmall] = useState(!!isQuote);
  const {transferState, isUploading, isPendingUpload, uploadProgress, cancelUpload, loadAsset} =
    useAssetTransfer(message);

  const [hideControls, setHideControls] = useState(false);
  const hideControlsCallback = useCallback(() => setHideControls(true), []);
  const {removeTimeout, startTimeout} = useTimeout(hideControlsCallback, 2000);

  useEffect(() => {
    if (assetPreviewResource && isFileSharingReceivingEnabled) {
      assetRepository
        .load(assetPreviewResource)
        .then(blob => blob && setVideoPreview(window.URL.createObjectURL(blob)));
    }
    return () => {
      if (videoPreview) {
        window.URL.revokeObjectURL(videoPreview);
      }
      if (videoSrc) {
        window.URL.revokeObjectURL(videoSrc);
      }
    };
  }, []);

  const onPlayButtonClicked = async (): Promise<void> => {
    if (isFileSharingReceivingEnabled) {
      setDisplaySmall(false);

      if (videoSrc && videoElement) {
        videoElement.play();
      } else {
        asset.status(AssetTransferState.DOWNLOADING);

        try {
          const blob = await loadAsset(asset.original_resource());
          if (!blob) {
            throw new Error('blob could not be loaded from asset');
          }
          setVideoSrc(window.URL.createObjectURL(blob));
          setIsVideoLoaded(true);
        } catch (error) {
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

  return !isObfuscated ? (
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
              src={videoSrc}
              poster={videoPreview}
              onError={event => {
                setVideoPlaybackError(true);
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
              <div className="video-asset__playback-error label-xs">{t('conversationPlaybackError')}</div>
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

          <div className="video-asset__container__sizer" />
        </>
      )}
    </div>
  ) : null;
};

export {VideoAsset};
