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

import {ReactNode} from 'react';

import {FileCard} from 'Components/FileCard/FileCard';

import {loadingWrapperStyles, wrapperStyles} from './FilePreviewCard.styles';

import {FilePreviewDeleteButton} from '../common/FilePreviewDeleteButton/FilePreviewDeleteButton';
import {FilePreviewErrorMoreButton} from '../common/FilePreviewErrorMoreButton/FilePreviewErrorMoreButton';
import {FilePreviewSpinner} from '../common/FilePreviewSpinner/FilePreviewSpinner';

interface FilePreviewCardProps {
  extension: string;
  name: string;
  size: string;
  isError?: boolean;
  isLoading?: boolean;
  onDelete: () => void;
  onRetry: () => void;
  children?: ReactNode;
}

export const FilePreviewCard = ({
  extension,
  name,
  size,
  isError,
  isLoading,
  onDelete,
  onRetry,
  children,
}: FilePreviewCardProps) => {
  return (
    <div css={wrapperStyles}>
      <FileCard.Root extension={extension} name={name} size={size}>
        <FileCard.Header>
          <FileCard.Icon />
          <FileCard.Type />
          {isLoading && (
            <div css={loadingWrapperStyles}>
              <FilePreviewSpinner />
            </div>
          )}
        </FileCard.Header>
        {!isLoading && isError && <FilePreviewErrorMoreButton onDelete={onDelete} onRetry={onRetry} />}
        {!isLoading && !isError && <FilePreviewDeleteButton onDelete={onDelete} />}
        <FileCard.Name />
        {children}
        {!isLoading && isError && <FileCard.Error />}
      </FileCard.Root>
    </div>
  );
};
