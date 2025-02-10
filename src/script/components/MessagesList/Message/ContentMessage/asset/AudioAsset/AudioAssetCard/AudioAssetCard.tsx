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

import {ReactNode, SyntheticEvent} from 'react';

import {FileCard} from 'Components/FileCard/FileCard';

import {contentStyles} from './AudioAssetCard.styles';

interface AudioMetadata {
  name: string;
  extension: string;
  size: string;
  duration: number;
  loudnessPreview: boolean;
}

interface AudioAssetCardProps {
  src?: string;
  getAudioElementRef: (element: HTMLMediaElement) => void;
  metadata: AudioMetadata;
  isError?: boolean;
  isLoading?: boolean;
  loadingProgress?: number;
  onTimeUpdate: (event: SyntheticEvent<HTMLAudioElement>) => void;
  children: ReactNode;
}

export const AudioAssetCard = ({
  src,
  metadata,
  children,
  isError,
  isLoading,
  loadingProgress,
  getAudioElementRef,
  onTimeUpdate,
}: AudioAssetCardProps) => {
  return (
    <FileCard.Root variant="large" extension={metadata.extension} name={metadata.name} size={metadata.size}>
      <FileCard.Header>
        <FileCard.Icon />
        <FileCard.Type />
      </FileCard.Header>
      <FileCard.Name />
      <FileCard.Content>
        <audio ref={getAudioElementRef} src={src} onTimeUpdate={onTimeUpdate} />
        <div css={contentStyles}>{children}</div>
      </FileCard.Content>
      {isError && <FileCard.Error />}
      {isLoading && <FileCard.Loading progress={loadingProgress} />}
    </FileCard.Root>
  );
};
