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

import {AssetTransferState} from 'Repositories/assets/AssetTransferState';
import type {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import type {FileAsset} from 'Repositories/entity/message/FileAsset';

import {AudioAssetCard} from './AudioAssetCard/AudioAssetCard';
import {AudioAssetPlaceholder} from './AudioAssetPlaceholder/AudioAssetPlaceholder';
import {AudioAssetRestricted} from './AudioAssetRestricted/AudioAssetRestricted';
import {AudioAssetSeekBar} from './AudioAssetSeekBar/AudioAssetSeekBar';
import {AudioAssetTimer} from './AudioAssetTimer/AudioAssetTimer';
import {controlStyles, playerWrapperStyles} from './AudioAssetV2.styles';
import {AudioPlayButton} from './AudioPlayButton/AudioPlayButton';
import {useAudioMetadata} from './useAudioMetadata/useAudioMetadata';
import {useAudioPlayer} from './useAudioPlayer/useAudioPlayer';

import {useAssetTransfer} from '../common/useAssetTransfer/useAssetTransfer';

export interface AudioAssetProps {
  message: ContentMessage;
  isFocusable?: boolean;
  isFileShareRestricted: boolean;
}

export const AudioAssetV2 = ({message, isFocusable, isFileShareRestricted}: AudioAssetProps) => {
  const asset = message.getFirstAsset() as FileAsset;
  const {transferState, uploadProgress, cancelUpload, getAssetUrl} = useAssetTransfer(message);

  const metadata = useAudioMetadata({asset, transferState});

  const {audioElement, setAudioElementRef, audioTime, audioSrc, handleTimeUpdate, handlePause, handlePlay} =
    useAudioPlayer({asset, getAssetUrl});

  if (isFileShareRestricted) {
    return <AudioAssetRestricted />;
  }

  if (transferState === AssetTransferState.UPLOAD_PENDING || !audioElement) {
    return (
      <AudioAssetCard
        src={audioSrc?.url}
        metadata={metadata}
        isLoading
        loadingProgress={uploadProgress}
        getAudioElementRef={setAudioElementRef}
        onTimeUpdate={handleTimeUpdate}
      >
        <AudioAssetPlaceholder variant="loading" />
      </AudioAssetCard>
    );
  }

  if (transferState === AssetTransferState.UPLOAD_FAILED) {
    return (
      <AudioAssetCard
        metadata={metadata}
        isError
        getAudioElementRef={setAudioElementRef}
        onTimeUpdate={handleTimeUpdate}
      >
        <AudioAssetPlaceholder variant="error" />
      </AudioAssetCard>
    );
  }

  return (
    <AudioAssetCard
      src={audioSrc?.url}
      getAudioElementRef={setAudioElementRef}
      metadata={metadata}
      onTimeUpdate={handleTimeUpdate}
    >
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
            loudnessPreview={metadata.loudnessPreview}
            disabled={!audioSrc}
          />
          <AudioAssetTimer currentTime={audioTime} overallDuration={metadata.duration} />
        </div>
      </div>
    </AudioAssetCard>
  );
};
