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

import {useState} from 'react';

import {FileCard} from 'Components/FileCard/FileCard';

import {wrapperStyles} from './FilePreviewCard.styles';

import {FilePreviewDeleteButton} from '../common/FilePreviewDeleteButton/FilePreviewDeleteButton';
import {FilePreviewErrorMoreButton} from '../common/FilePreviewErrorMoreButton/FilePreviewErrorMoreButton';
import {FilePreviewLoading} from '../common/FilePreviewLoading/FilePreviewLoading';

interface FilePreviewCardProps {
  extension: string;
  name: string;
  size: string;
  isError: boolean;
  isLoading: boolean;
  onDelete: () => void;
  onRetry: () => void;
}

export const FilePreviewCard = ({
  extension,
  name,
  size,
  isError,
  isLoading,
  onDelete,
  onRetry,
}: FilePreviewCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div css={wrapperStyles} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <FileCard.Root extension={extension} name={name} size={size}>
        <FileCard.Header>
          <FileCard.Icon type={isError ? 'error' : 'file'} />
          <FileCard.Type />
        </FileCard.Header>
        <FileCard.Name />
        {isError && (
          <>
            <FileCard.Error />
            <FilePreviewErrorMoreButton onDelete={onDelete} onRetry={onRetry} />
          </>
        )}
        {isLoading && <FilePreviewLoading />}
        {(!isError && !isLoading) || (isLoading && isHovered) ? <FilePreviewDeleteButton onDelete={onDelete} /> : null}
      </FileCard.Root>
    </div>
  );
};
