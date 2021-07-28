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
import {TeamState} from '../../team/TeamState';
import {container} from 'tsyringe';
import cx from 'classnames';

import {getLogger} from 'Util/Logger';
import {formatSeconds} from 'Util/TimeUtil';

import {AssetTransferState} from '../../assets/AssetTransferState';
import type {ContentMessage} from '../../entity/message/ContentMessage';
import type {FileAsset} from '../../entity/message/FileAsset';

import RestrictedAudio from './RestrictedAudio';
import SeekBar from './controls/SeekBar';
import AudioSeekBar from './controls/AudioSeekBar';
import AssetHeader from './AssetHeader';
import MediaButton from './controls/MediaButton';

import Icon from 'Components/Icon';
import useEffectRef from 'Util/useEffectRef';
import {useAssetTransfer} from './AbstractAssetTransferStateTracker';
import {AssetRepository} from '../../assets/AssetRepository';
import {registerReactComponent} from 'Util/ComponentUtil';

const logger = getLogger('AudioAssetComponent');

export interface AudioAssetProps {
  assetRepository?: AssetRepository;
  className?: string;
  header: boolean;
  /* Does the asset have a visible header? */
  message: ContentMessage;
  teamState?: TeamState;
}

const AudioAsset: React.FC<AudioAssetProps> = ({
  header,
  message,
  className,
  teamState = container.resolve(TeamState),
  assetRepository = container.resolve(AssetRepository),
}) => {
  const asset = message.getFirstAsset() as FileAsset;
  const [audioElement, setAudioElement] = useEffectRef<HTMLAudioElement>();
  const isFileSharingReceivingEnabled = teamState.isFileSharingReceivingEnabled();
  const {transferState, uploadProgress, cancelUpload} = useAssetTransfer(message);
  const [audioTime, setAudioTime] = useState<number>(asset?.meta?.duration || 0);
  const [audioSrc, setAudioSrc] = useState<string>();
  const onTimeupdate = () => setAudioTime(audioElement.currentTime);
  const showLoudnessPreview = !!(asset.meta?.loudness?.length > 0);
  const onPauseButtonClicked = () => audioElement?.pause();

  const onPlayButtonClicked = async () => {
    if (audioSrc) {
      audioElement?.play();
    } else {
      asset.status(AssetTransferState.DOWNLOADING);
      try {
        const blob = await assetRepository.load(asset.original_resource());
        setAudioSrc(window.URL.createObjectURL(blob));
        audioElement?.play();
      } catch (error) {
        logger.error('Failed to load audio asset ', error);
      }
      asset.status(AssetTransferState.UPLOADED);
    }
  };

  useEffect(() => {
    return () => {
      window.URL.revokeObjectURL(audioSrc);
    };
  }, []);

  return (
    <div className={cx('audio-asset', className)} data-uie-name="audio-asset" data-uie-value={asset.file_name}>
      <audio ref={setAudioElement} src={audioSrc} onTimeUpdate={onTimeupdate} />
      {!message.isObfuscated() && (
        <>
          {header && (
            <div style={{width: '100%'}}>
              <AssetHeader message={message} />
            </div>
          )}
          {!isFileSharingReceivingEnabled && <RestrictedAudio />}

          {isFileSharingReceivingEnabled && (
            <>
              {transferState === AssetTransferState.UPLOAD_PENDING && (
                <div className="asset-placeholder loading-dots" />
              )}
              {transferState !== AssetTransferState.UPLOAD_PENDING && (
                <div className="audio-controls">
                  <MediaButton
                    mediaElement={audioElement}
                    large={false}
                    asset={asset}
                    play={onPlayButtonClicked}
                    pause={onPauseButtonClicked}
                    cancel={cancelUpload}
                    transferState={transferState}
                    uploadProgress={uploadProgress}
                  />

                  {transferState !== AssetTransferState.UPLOADING && (
                    <>
                      <span className="audio-controls-time label-xs" data-uie-name="status-audio-time">
                        {formatSeconds(audioTime)}
                      </span>
                      {showLoudnessPreview && (
                        <AudioSeekBar
                          data-uie-name="status-audio-seekbar"
                          audioElement={audioElement}
                          asset={asset}
                          disabled={!audioSrc}
                        />
                      )}
                      {!showLoudnessPreview && (
                        <SeekBar
                          dark
                          data-uie-name="status-audio-seekbar"
                          mediaElement={audioElement}
                          disabled={!audioSrc}
                        />
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
      {message.isObfuscated() && <Icon.MicOn />}
    </div>
  );
};

export default AudioAsset;

registerReactComponent<AudioAssetProps>('audio-asset', {
  bindings: 'header, className, message, teamState, assetRepository',
  component: AudioAsset,
});
