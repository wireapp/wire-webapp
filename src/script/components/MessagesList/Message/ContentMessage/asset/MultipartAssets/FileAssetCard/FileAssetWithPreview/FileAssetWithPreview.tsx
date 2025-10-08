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

import {CSSProperties, useId, useState} from 'react';

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
import {FilePreviewModal} from '../common/FilePreviewModal/FilePreviewModal';

interface FileAssetWithPreviewProps {
  src?: string;
  extension: string;
  name: string;
  size: string;
  imagePreviewUrl?: string;
  pdfPreviewUrl?: string;
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
  imagePreviewUrl,
  pdfPreviewUrl,
  isError,
  isLoading,
  senderName,
  timestamp,
}: FileAssetWithPreviewProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const shouldDisplayLoading = (imagePreviewUrl ? !isImageLoaded : isLoading) && !isError;
  const shouldDisplayPreviewError = isError || (!isLoading && !imagePreviewUrl);

  const id = useId();

  return (
    <FileCard.Root variant="large" extension={extension} name={name} size={size}>
      <FileCard.Header>
        <FileCard.Icon type={isError ? 'unavailable' : 'file'} />
        {!isError && <FileCard.Type />}
        <FileCard.Name variant={isError ? 'secondary' : 'primary'} />
        {!isError && <FileAssetOptions src={src} name={name} extension={extension} onOpen={() => setIsOpen(true)} />}
      </FileCard.Header>
      <FileCard.Content>
        <button
          css={contentWrapperStyles}
          onClick={() => setIsOpen(true)}
          aria-label={t('cells.options.open')}
          aria-controls={id}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          disabled={isError}
        >
          <img
            src={imagePreviewUrl}
            style={{'--opacity': isImageLoaded && imagePreviewUrl ? 1 : 0} as CSSProperties}
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
                  <p css={errorTextStyles}>
                    {isError ? t('cells.unavailableFile') : t('cells.unavailableFilePreview')}
                  </p>
                </>
              )}
            </div>
          </div>
        </button>
      </FileCard.Content>
      <FilePreviewModal
        id={id}
        fileUrl={src}
        filePdfPreviewUrl={pdfPreviewUrl}
        fileImagePreviewUrl={imagePreviewUrl}
        fileName={name}
        fileExtension={extension}
        senderName={senderName}
        timestamp={timestamp}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        isLoading={isLoading}
        isError={isError}
      />
    </FileCard.Root>
  );
};
