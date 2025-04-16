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

import {forwardRef, ReactNode} from 'react';

import {FileCard} from 'Components/FileCard/FileCard';
import {t} from 'Util/LocalizerUtil';

import {contentWrapperStyles} from './VideoAssetCard.styles';

interface VideoAssetCardProps {
  extension: string;
  name: string;
  size: string;
  isError?: boolean;
  isLoading?: boolean;
  children: ReactNode;
}

export const VideoAssetCard = forwardRef<HTMLDivElement, VideoAssetCardProps>(
  ({extension, name, size, isError, children}, ref) => {
    const formattedName = isError ? t('cellsUnavailableFile') : name;

    return (
      <FileCard.Root variant="large" extension={extension} name={formattedName} size={size}>
        <FileCard.Header>
          <FileCard.Icon type={isError ? 'unavailable' : 'file'} />
          {!isError && <FileCard.Type />}
          <FileCard.Name variant={isError ? 'secondary' : 'primary'} />
        </FileCard.Header>
        <FileCard.Content>
          <div ref={ref} css={contentWrapperStyles}>
            {children}
          </div>
        </FileCard.Content>
      </FileCard.Root>
    );
  },
);

VideoAssetCard.displayName = 'VideoAssetCard';
