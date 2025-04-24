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

import {CSSProperties, useState} from 'react';

import {AlertIcon} from '@wireapp/react-ui-kit';

import {FileCard} from 'Components/FileCard/FileCard';
import {t} from 'Util/LocalizerUtil';

import {
  contentWrapperStyles,
  errorIconStyles,
  errorTextStyles,
  imageStyles,
  infoOverlayStyles,
  infoWrapperStyles,
  loaderIconStyles,
} from './FileAssetWithPreview.styles';

import {FileAssetOptions} from '../common/FileAssetOptions/FileAssetOptions';

interface FileAssetWithPreviewProps {
  src?: string;
  extension: string;
  name: string;
  size: string;
  previewUrl?: string;
  isLoading: boolean;
  isError: boolean;
  senderName: string;
  timestamp: number;
}

export const FileAssetWithPreview = ({
  src,
  extension,
  name,
  size,
  previewUrl,
  isError,
  isLoading,
  senderName,
  timestamp,
}: FileAssetWithPreviewProps) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const shouldDisplayLoading = (previewUrl ? !isImageLoaded : isLoading) && !isError;
  const shouldDisplayPreviewError = isError || (!isLoading && !previewUrl);

  return (
    <>
      <FileCard.Root variant="large" extension={extension} name={name} size={size}>
        <FileCard.Header>
          <FileCard.Icon type={isError ? 'unavailable' : 'file'} />
          {!isError && <FileCard.Type />}
          <FileCard.Name variant={isError ? 'secondary' : 'primary'} />
          <FileAssetOptions src={src} name={name} extension={extension} senderName={senderName} timestamp={timestamp} />
        </FileCard.Header>
        <FileCard.Content>
          <div css={contentWrapperStyles}>
            <img
              src={previewUrl}
              style={{'--opacity': isImageLoaded && previewUrl ? 1 : 0} as CSSProperties}
              alt=""
              css={imageStyles}
              onLoad={() => setIsImageLoaded(true)}
            />

            <div css={infoOverlayStyles}>
              <div css={infoWrapperStyles}>
                {shouldDisplayLoading && <div className="icon-spinner spin" css={loaderIconStyles} />}
                {shouldDisplayPreviewError && (
                  <>
                    <AlertIcon css={errorIconStyles} width={14} height={14} />
                    <p css={errorTextStyles}>{t('cellsUnavailableFilePreview')}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </FileCard.Content>
      </FileCard.Root>
    </>
  );
};
