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

import {t} from 'Util/LocalizerUtil';

import {AudioAssetCard} from './AudioAssetCard/AudioAssetCard';
import {AudiAssetError} from './AudioAssetError/AudioAssetError';
import {AudioAssetLoading} from './AudioAssetLoading/AudioAssetLoading';
import {controlStyles, playerWrapperStyles} from './AudioAssetNew.styles';
import {AudioAssetSeekBar} from './AudioAssetSeekBar/AudioAssetSeekBar';
import {AudioAssetTimer} from './AudioAssetTimer/AudioAssetTimer';
// import {AudioEmptySeekBar} from './AudioAssetLoading/AudioEmptySeekBar/AudioEmptySeekBar';
import {AudioPlayButton} from './AudioPlayButton/AudioPlayButton';
import {useAudioMetadata} from './useAudioMetadata/useAudioMetadata';
import {useAudioPlayer} from './useAudioPlayer/useAudioPlayer';

import {AssetTransferState} from '../../../../../../assets/AssetTransferState';
import type {ContentMessage} from '../../../../../../entity/message/ContentMessage';
import type {FileAsset} from '../../../../../../entity/message/FileAsset';
import {useAssetTransfer} from '../useAssetTransfer';

export interface AudioAssetProps {
  message: ContentMessage;
  isFocusable?: boolean;
  isFileShareRestricted: boolean;
}

export const AudioAssetNew = ({message, isFocusable, isFileShareRestricted}: AudioAssetProps) => {
  const asset = message.getFirstAsset() as FileAsset;
  const {transferState, uploadProgress, cancelUpload, getAssetUrl} = useAssetTransfer(message);

  const {name, extension, size, duration, loudnessPreview} = useAudioMetadata({asset, transferState});

  const {audioElement, setAudioElementRef, audioTime, audioSrc, handleTimeUpdate, handlePause, handlePlay} =
    useAudioPlayer({asset, getAssetUrl});

  if (isFileShareRestricted) {
    return <AudiAssetError message={t('conversationAudioAssetRestricted')} />;
  }

  if (transferState === AssetTransferState.UPLOAD_PENDING || !audioElement) {
    return (
      <AudioAssetCard extension={extension} name={name} size={size} isLoading loadingProgress={uploadProgress}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio ref={setAudioElementRef} src={audioSrc?.url} onTimeUpdate={handleTimeUpdate} />
        <AudioAssetLoading />
      </AudioAssetCard>
    );
  }

  return (
    <>
      <AudioAssetCard
        extension={extension}
        name={name}
        size={size}
        isError={transferState === AssetTransferState.UPLOAD_FAILED}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio ref={setAudioElementRef} src={audioSrc?.url} onTimeUpdate={handleTimeUpdate} />
        <div css={controlStyles}>
          <AudioPlayButton
            mediaElement={audioElement}
            onPlay={handlePlay}
            onPause={handlePause}
            onCancel={cancelUpload}
            transferState={transferState}
            isFocusable={isFocusable}
          />
          <div css={playerWrapperStyles}>
            <AudioAssetSeekBar
              audioElement={audioElement}
              asset={asset}
              loudnessPreview={loudnessPreview}
              disabled={!audioSrc}
            />
            <AudioAssetTimer currentTime={audioTime} overallDuration={duration} />
          </div>
        </div>
      </AudioAssetCard>
    </>
  );
};
