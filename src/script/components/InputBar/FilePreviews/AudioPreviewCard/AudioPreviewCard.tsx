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

import {FileCard} from 'Components/FileCard/FileCard';
import {
  controlStyles,
  playerWrapperStyles,
} from 'Components/MessagesList/Message/ContentMessage/asset/AudioAsset/AudioAssetV2.styles';

import {AudioEmptySeekBar} from './AudioEmptySeekBar/AudioEmptySeekBar';
import {wrapperStyles} from './AudioPreviewCard.styles';

import {FilePreviewDeleteButton} from '../common/FilePreviewDeleteButton/FilePreviewDeleteButton';
import {FilePreviewPlayButton} from '../common/FilePreviewPlayButton/FilePreviewPlayButton';

interface AudioPreviewCardProps {
  extension: string;
  name: string;
  size: string;
  isError?: boolean;
  isLoading?: boolean;
  loadingProgress?: number;
  onDelete: () => void;
}

export const AudioPreviewCard = ({
  extension,
  name,
  size,
  isError,
  isLoading,
  loadingProgress,
  onDelete,
}: AudioPreviewCardProps) => {
  return (
    <div css={wrapperStyles}>
      <FileCard.Root extension={extension} name={name} size={size}>
        <FileCard.Header>
          <FileCard.Icon />
          <FileCard.Type />
          <FileCard.Name />
        </FileCard.Header>
        <FilePreviewDeleteButton onDelete={onDelete} />
        <div css={controlStyles}>
          <FilePreviewPlayButton />
          <div css={playerWrapperStyles}>
            <AudioEmptySeekBar />
          </div>
        </div>
        {isError && <FileCard.Error />}
        {isLoading && <FileCard.Loading progress={loadingProgress} />}
      </FileCard.Root>
    </div>
  );
};
