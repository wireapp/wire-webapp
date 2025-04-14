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

import {t} from 'Util/LocalizerUtil';

import {FileAssetSmall} from './FileAssetSmall/FileAsseetSmall';
import {FileAssetWithPreview} from './FileAssetWithPreview/FileAssetWithPreview';

interface FileAssetCardProps {
  variant: 'large' | 'small';
  extension: string;
  name: string;
  size: string;
  isLoading: boolean;
  isError: boolean;
  previewUrl?: string;
}

export const FileAssetCard = ({variant, extension, name, size, isLoading, isError, previewUrl}: FileAssetCardProps) => {
  const formattedName = isError ? t('cellsUnavailableFile') : name;

  if (variant === 'large') {
    return (
      <FileAssetWithPreview
        extension={extension}
        name={formattedName}
        size={size}
        isError={isError}
        isLoading={isLoading}
        previewUrl={previewUrl}
      />
    );
  }

  return <FileAssetSmall extension={extension} name={formattedName} size={size} isError={isError} />;
};
