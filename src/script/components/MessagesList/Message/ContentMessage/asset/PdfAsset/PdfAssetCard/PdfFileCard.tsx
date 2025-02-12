/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {forwardRef, ReactNode} from 'react';

import {FileCard} from 'src/script/components/FileCard/FileCard';

import {contentWrapperStyles} from './PdfFileCard.styles';

interface PdfFileCardProps {
  extension: string;
  name: string;
  size: string;
  isError?: boolean;
  isLoading?: boolean;
  loadingProgress?: number;
  children: ReactNode;
}

export const PdfFileCard = forwardRef<HTMLDivElement, PdfFileCardProps>(
  ({extension, name, size, isError, isLoading, loadingProgress, children}, ref) => {
    return (
      <FileCard.Root variant="large" extension={extension} name={name} size={size}>
        <FileCard.Header>
          <FileCard.Icon />
          <FileCard.Type />
          <FileCard.Name />
        </FileCard.Header>
        <FileCard.Content>
          <div ref={ref} css={contentWrapperStyles}>
            {children}
          </div>
        </FileCard.Content>
        {isError && <FileCard.Error />}
        {isLoading && <FileCard.Loading progress={loadingProgress} />}
      </FileCard.Root>
    );
  },
);

PdfFileCard.displayName = 'PdfFileCard';
