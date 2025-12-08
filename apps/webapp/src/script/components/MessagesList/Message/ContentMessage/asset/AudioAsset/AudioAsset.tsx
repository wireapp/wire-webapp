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

import {useEffect, useState} from 'react';

import cx from 'classnames';
import {container} from 'tsyringe';

import * as Icon from 'Components/Icon';
import {AssetTransferState} from 'Repositories/assets/AssetTransferState';
import type {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import type {FileAsset} from 'Repositories/entity/message/FileAsset';
import {TeamState} from 'Repositories/team/TeamState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {getLogger} from 'Util/Logger';
import {formatSeconds} from 'Util/TimeUtil';
import {useEffectRef} from 'Util/useEffectRef';

import {AudioSeekBar} from './AudioSeekBar/AudioSeekBar';
import {RestrictedAudio} from './RestrictedAudio/RestrictedAudio';

import {AssetHeader} from '../common/AssetHeader/AssetHeader';
import {MediaButton} from '../common/MediaButton/MediaButton';
import {SeekBar} from '../common/SeekBar/SeekBar';
import {AssetUrl, useAssetTransfer} from '../common/useAssetTransfer/useAssetTransfer';

const logger = getLogger('AudioAssetComponent');

interface AudioAssetProps {
  className?: string;
  /* Does the asset have a visible header? */
  hasHeader?: boolean;
  message: ContentMessage;
  teamState?: TeamState;
  isFocusable?: boolean;
}

export const AudioAsset = ({
  message,
  className,
  hasHeader = false,
  teamState = container.resolve(TeamState),
  isFocusable = true,
}: AudioAssetProps) => {
  const asset = message.getFirstAsset() as FileAsset;
  const [audioElement, setAudioElement] = useEffectRef<HTMLMediaElement>();
  const {isFileSharingReceivingEnabled} = useKoSubscribableChildren(teamState, ['isFileSharingReceivingEnabled']);
  const {isObfuscated} = useKoSubscribableChildren(message, ['isObfuscated']);
  const {transferState, uploadProgress, cancelUpload, getAssetUrl} = useAssetTransfer(message);
  const [audioTime, setAudioTime] = useState<number>(asset?.meta?.duration || 0);
  const [audioSrc, setAudioSrc] = useState<AssetUrl>();
  const onTimeupdate = () => audioElement && setAudioTime(audioElement.currentTime);
  const showLoudnessPreview = !!(asset.meta?.loudness?.length ?? 0 > 0);
  const onPauseButtonClicked = () => audioElement?.pause();

  const onPlayButtonClicked = async () => {
    if (audioSrc) {
      audioElement?.play();
    } else {
      asset.status(AssetTransferState.DOWNLOADING);
      try {
        const url = await getAssetUrl(asset.original_resource());
        setAudioSrc(url);
      } catch (error) {
        logger.error('Failed to load audio asset ', error);
      }
      asset.status(AssetTransferState.UPLOADED);
    }
  };

  useEffect(() => {
    if (audioSrc && audioElement) {
      const playPromise = audioElement.play();

      playPromise?.catch(error => {
        logger.error('Failed to load audio asset ', error);
      });
    }
  }, [audioElement, audioSrc]);

  useEffect(() => () => audioSrc?.dispose(), []);

  return (
    <div className={cx('audio-asset', className)} data-uie-name="audio-asset" data-uie-value={asset.file_name}>
      <audio ref={setAudioElement} src={audioSrc?.url} onTimeUpdate={onTimeupdate} />

      {!isObfuscated ? (
        <>
          {hasHeader && (
            <div style={{width: '100%'}}>
              <AssetHeader message={message} />
            </div>
          )}
          {isFileSharingReceivingEnabled ? (
            <>
              {transferState === AssetTransferState.UPLOAD_PENDING && (
                <div className="asset-placeholder loading-dots" />
              )}
              {transferState !== AssetTransferState.UPLOAD_PENDING && (
                <div className="audio-controls">
                  <MediaButton
                    mediaElement={audioElement}
                    asset={asset}
                    play={onPlayButtonClicked}
                    pause={onPauseButtonClicked}
                    cancel={cancelUpload}
                    transferState={transferState}
                    uploadProgress={uploadProgress}
                    isFocusable={isFocusable}
                  />

                  {transferState !== AssetTransferState.UPLOADING && audioElement && (
                    <>
                      <span className="audio-controls-time label-xs" data-uie-name="status-audio-time">
                        {formatSeconds(audioTime)}
                      </span>
                      {showLoudnessPreview ? (
                        <AudioSeekBar audioElement={audioElement} asset={asset} disabled={!audioSrc} />
                      ) : (
                        <SeekBar
                          dark
                          mediaElement={audioElement}
                          disabled={!audioSrc}
                          data-uie-name="status-audio-seekbar"
                        />
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <RestrictedAudio />
          )}
        </>
      ) : (
        <Icon.MicOnIcon />
      )}
    </div>
  );
};
