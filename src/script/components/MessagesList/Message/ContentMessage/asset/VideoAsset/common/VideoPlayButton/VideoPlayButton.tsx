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

import {ReactNode, useEffect} from 'react';

import {CloseIcon, PauseIcon, PlayIcon} from '@wireapp/react-ui-kit';

import {useMessageFocusedTabIndex} from 'Components/MessagesList/Message/util';
import {AssetTransferState} from 'src/script/assets/AssetTransferState';
import {t} from 'Util/LocalizerUtil';

import {wrapperStyles, playButtonStyles, wrapperStylesFullscreen} from './VideoPlayButton.styles';

export interface VideoPlayButtonProps {
  mediaElement?: HTMLMediaElement;
  onPause: () => void;
  onPlay: () => void;
  onCancel?: () => void;
  transferState: AssetTransferState;
  isPlaying: boolean;
  isFocusable?: boolean;
  isDisabled?: boolean;
  isFullscreen?: boolean;
}

export const VideoPlayButton = ({
  mediaElement,
  transferState,
  onPlay,
  onPause,
  onCancel,
  isPlaying,
  isFocusable = true,
  isFullscreen = false,
  isDisabled = false,
}: VideoPlayButtonProps) => {
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isFocusable);

  const isUploaded = transferState === AssetTransferState.UPLOADED;
  const isDownloading = transferState === AssetTransferState.DOWNLOADING;
  const isUploading = transferState === AssetTransferState.UPLOADING;

  useEffect(() => {
    if (!mediaElement) {
      return undefined;
    }

    mediaElement.addEventListener('playing', onPlay);
    mediaElement.addEventListener('pause', onPause);

    return () => {
      mediaElement.removeEventListener('playing', onPlay);
      mediaElement.removeEventListener('pause', onPause);
    };
  }, [mediaElement, onPlay, onPause]);

  if (isUploading || isDownloading) {
    return (
      <VideoButton
        label={t('conversationAudioAssetCancel')}
        onClick={onCancel}
        tabIndex={messageFocusedTabIndex}
        isDisabled
        isFullscreen={isFullscreen}
      >
        <CloseIcon width={10} height={10} />
      </VideoButton>
    );
  }

  if (isUploaded) {
    return (
      <VideoButton
        label={isPlaying ? t('conversationAudioAssetPause') : t('conversationAudioAssetPlay')}
        onClick={isPlaying ? onPause : onPlay}
        tabIndex={messageFocusedTabIndex}
        isDisabled={isDisabled}
        isFullscreen={isFullscreen}
      >
        {isPlaying ? <PauseIcon width={10} height={10} /> : <PlayIcon width={10} height={10} />}
      </VideoButton>
    );
  }

  return null;
};

interface VideoButtonProps {
  label: string;
  isDisabled?: boolean;
  isFullscreen?: boolean;
  onClick?: () => void;
  children: ReactNode;
  tabIndex: number;
}

const VideoButton = ({
  label,
  isDisabled = false,
  isFullscreen = false,
  onClick,
  children,
  tabIndex,
}: VideoButtonProps) => {
  return (
    <button
      type="button"
      css={isFullscreen ? wrapperStylesFullscreen : wrapperStyles}
      onClick={onClick}
      disabled={isDisabled}
      data-uie-name="do-play-media"
      aria-label={label}
      tabIndex={tabIndex}
    >
      <div css={playButtonStyles}>{children}</div>
    </button>
  );
};
