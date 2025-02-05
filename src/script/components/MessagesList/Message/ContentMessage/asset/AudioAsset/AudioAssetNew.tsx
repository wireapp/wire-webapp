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
import {controlStyles, playerWrapperStyles} from './AudioAssetNew.styles';
import {AudioAssetPlaceholder} from './AudioAssetPlaceholder/AudioAssetPlaceholder';
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

  const metadata = useAudioMetadata({asset, transferState});

  const {audioElement, setAudioElementRef, audioTime, audioSrc, handleTimeUpdate, handlePause, handlePlay} =
    useAudioPlayer({asset, getAssetUrl});

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

  if (isFileShareRestricted) {
    return <AudiAssetError message={t('conversationAudioAssetRestricted')} />;
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
