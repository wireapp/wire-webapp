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

import {ReactNode, useEffect, useState} from 'react';

import {CloseIcon, PauseIcon, PlayIcon} from '@wireapp/react-ui-kit';

import {useMessageFocusedTabIndex} from 'Components/MessagesList/Message/util';
import {AssetTransferState} from 'Repositories/assets/AssetTransferState';
import {t} from 'Util/LocalizerUtil';

import {playButtonStyles, wrapperStyles} from './AudioPlayButton.styles';

export interface AudioPlayButtonProps {
  mediaElement?: HTMLMediaElement;
  onPause: () => void;
  onPlay: () => void;
  onCancel: () => void;
  transferState: AssetTransferState;
  isFocusable?: boolean;
  isDisabled?: boolean;
}

export const AudioPlayButton = ({
  mediaElement,
  transferState,
  onPlay,
  onPause,
  onCancel,
  isFocusable = true,
}: AudioPlayButtonProps) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  const messageFocusedTabIndex = useMessageFocusedTabIndex(isFocusable);

  const isUploaded = transferState === AssetTransferState.UPLOADED;
  const isDownloading = transferState === AssetTransferState.DOWNLOADING;
  const isUploading = transferState === AssetTransferState.UPLOADING;

  useEffect(() => {
    if (!mediaElement) {
      return undefined;
    }

    mediaElement.addEventListener('playing', handlePlay);
    mediaElement.addEventListener('pause', handlePause);

    return () => {
      mediaElement.removeEventListener('playing', handlePlay);
      mediaElement.removeEventListener('pause', handlePause);
    };
  }, [mediaElement]);

  if (isUploading || isDownloading) {
    return (
      <AudioButton label={t('conversationAudioAssetCancel')} onClick={onCancel} tabIndex={messageFocusedTabIndex}>
        <CloseIcon width={10} height={10} />
      </AudioButton>
    );
  }

  if (isUploaded) {
    return (
      <AudioButton
        label={isPlaying ? t('conversationAudioAssetPause') : t('conversationAudioAssetPlay')}
        onClick={isPlaying ? onPause : onPlay}
        tabIndex={messageFocusedTabIndex}
      >
        {isPlaying ? <PauseIcon width={10} height={10} /> : <PlayIcon width={10} height={10} />}
      </AudioButton>
    );
  }

  return null;
};

interface AudioButtonProps {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  tabIndex: number;
}

const AudioButton = ({label, disabled, onClick, children, tabIndex}: AudioButtonProps) => {
  return (
    <div css={wrapperStyles}>
      <button
        type="button"
        css={playButtonStyles}
        onClick={onClick}
        disabled={disabled}
        data-uie-name="do-play-media"
        aria-label={label}
        tabIndex={tabIndex}
      >
        {children}
      </button>
    </div>
  );
};
