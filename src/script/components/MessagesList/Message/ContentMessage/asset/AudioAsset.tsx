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

import React, {useEffect, useRef, useState} from 'react';
import {TeamState} from '../../../../../team/TeamState';
import {container} from 'tsyringe';
import cx from 'classnames';

import {getLogger} from 'Util/Logger';
import {formatSeconds} from 'Util/TimeUtil';

import {AssetTransferState} from '../../../../../assets/AssetTransferState';
import type {ContentMessage} from '../../../../../entity/message/ContentMessage';
import type {FileAsset} from '../../../../../entity/message/FileAsset';

import RestrictedAudio from 'Components/asset/RestrictedAudio';
import SeekBar from './controls/SeekBar';
import AudioSeekBar from './controls/AudioSeekBar';
import AssetHeader from './AssetHeader';
import MediaButton from './controls/MediaButton';

import Icon from 'Components/Icon';
import {useAssetTransfer} from './AbstractAssetTransferStateTracker';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

const logger = getLogger('AudioAssetComponent');

export interface AudioAssetProps {
  className?: string;
  /* Does the asset have a visible header? */
  hasHeader?: boolean;
  message: ContentMessage;
  teamState?: TeamState;
}

const AudioAsset: React.FC<AudioAssetProps> = ({
  message,
  className,
  hasHeader = false,
  teamState = container.resolve(TeamState),
}) => {
  const asset = message.getFirstAsset() as FileAsset;
  const audioElement = useRef<HTMLAudioElement>(null);
  const {isFileSharingReceivingEnabled} = useKoSubscribableChildren(teamState, ['isFileSharingReceivingEnabled']);
  const {isObfuscated} = useKoSubscribableChildren(message, ['isObfuscated']);
  const {transferState, uploadProgress, cancelUpload, loadAsset} = useAssetTransfer(message);
  const [audioTime, setAudioTime] = useState<number>(asset?.meta?.duration ?? 0);
  const [audioSrc, setAudioSrc] = useState<string>();

  const audio = audioElement.current;

  const onTimeupdate = () => setAudioTime(audio?.currentTime ?? 0);
  const showLoudnessPreview = !!asset.meta?.loudness?.length;
  const onPauseButtonClicked = () => audioElement.current?.pause();

  const onPlayButtonClicked = async () => {
    if (audioSrc) {
      audioElement.current?.play();
    } else {
      asset.status(AssetTransferState.DOWNLOADING);
      try {
        const blob = await loadAsset(asset.original_resource());
        setAudioSrc(window.URL.createObjectURL(blob));
      } catch (error) {
        logger.error('Failed to load audio asset ', error);
      }
      asset.status(AssetTransferState.UPLOADED);
    }
  };

  useEffect(() => {
    if (audioSrc && audioElement) {
      const playPromise = audioElement.current?.play();

      playPromise?.catch(error => {
        logger.error('Failed to load audio asset ', error);
      });
    }
  }, [audioElement, audioSrc]);

  useEffect(() => {
    return () => {
      window.URL.revokeObjectURL(audioSrc ?? '');
    };
  }, []);

  return (
    <div className={cx('audio-asset', className)} data-uie-name="audio-asset" data-uie-value={asset.file_name}>
      <audio ref={audioElement} src={audioSrc} onTimeUpdate={onTimeupdate} />

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
                    mediaElement={audio ?? undefined}
                    asset={asset}
                    play={onPlayButtonClicked}
                    pause={onPauseButtonClicked}
                    cancel={cancelUpload}
                    transferState={transferState}
                    uploadProgress={uploadProgress}
                  />

                  {transferState !== AssetTransferState.UPLOADING && audio && (
                    <>
                      <span className="audio-controls-time label-xs" data-uie-name="status-audio-time">
                        {formatSeconds(audioTime)}
                      </span>
                      {showLoudnessPreview ? (
                        <AudioSeekBar audioElement={audio} asset={asset} disabled={!audioSrc} />
                      ) : (
                        <SeekBar dark mediaElement={audio} disabled={!audioSrc} data-uie-name="status-audio-seekbar" />
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

export default AudioAsset;
