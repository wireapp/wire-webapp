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

import React, {useEffect, useState} from 'react';

import cx from 'classnames';
import {container} from 'tsyringe';

import {RestrictedAudio} from 'Components/asset/RestrictedAudio';
import {Icon} from 'Components/Icon';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {getLogger} from 'Util/Logger';
import {formatSeconds} from 'Util/TimeUtil';
import {useEffectRef} from 'Util/useEffectRef';

import {useAssetTransfer} from './AbstractAssetTransferStateTracker';
import {AssetHeader} from './AssetHeader';
import {AudioSeekBar} from './controls/AudioSeekBar';
import {MediaButton} from './controls/MediaButton';
import {SeekBar} from './controls/SeekBar';

import {AssetTransferState} from '../../../../../assets/AssetTransferState';
import type {ContentMessage} from '../../../../../entity/message/ContentMessage';
import type {FileAsset} from '../../../../../entity/message/FileAsset';
import {TeamState} from '../../../../../team/TeamState';

const logger = getLogger('AudioAssetComponent');

export interface AudioAssetProps {
  className?: string;
  /* Does the asset have a visible header? */
  hasHeader?: boolean;
  message: ContentMessage;
  teamState?: TeamState;
  isFocusable?: boolean;
}

const AudioAsset: React.FC<AudioAssetProps> = ({
  message,
  className,
  hasHeader = false,
  teamState = container.resolve(TeamState),
  isFocusable = true,
}) => {
  const asset = message.getFirstAsset() as FileAsset;
  const [audioElement, setAudioElement] = useEffectRef<HTMLAudioElement>();
  const {isFileSharingReceivingEnabled} = useKoSubscribableChildren(teamState, ['isFileSharingReceivingEnabled']);
  const {isObfuscated} = useKoSubscribableChildren(message, ['isObfuscated']);
  const {transferState, uploadProgress, cancelUpload, loadAsset} = useAssetTransfer(message);
  const [audioTime, setAudioTime] = useState<number>(asset?.meta?.duration || 0);
  const [audioSrc, setAudioSrc] = useState<string>();
  const onTimeupdate = () => audioElement && setAudioTime(audioElement.currentTime);
  const showLoudnessPreview = !!(asset.meta?.loudness?.length ?? 0 > 0);
  const onPauseButtonClicked = () => audioElement?.pause();

  const onPlayButtonClicked = async () => {
    if (audioSrc) {
      audioElement?.play();
    } else {
      asset.status(AssetTransferState.DOWNLOADING);
      try {
        const blob = await loadAsset(asset.original_resource());
        if (!blob) {
          throw new Error('blob could not be loaded from asset');
        }
        setAudioSrc(window.URL.createObjectURL(blob));
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

  useEffect(() => {
    return () => {
      if (audioSrc) {
        window.URL.revokeObjectURL(audioSrc);
      }
    };
  }, []);

  return (
    <div className={cx('audio-asset', className)} data-uie-name="audio-asset" data-uie-value={asset.file_name}>
      <audio ref={setAudioElement} src={audioSrc} onTimeUpdate={onTimeupdate} />

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
        <Icon.MicOn />
      )}
    </div>
  );
};

export {AudioAsset};
