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

import {FileCard} from 'Components/fileCard/fileCard';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {
  contentWrapperStyles,
  errorIconStyles,
  errorTextStyles,
  imageStyles,
  infoOverlayStyles,
  infoWrapperStyles,
  loaderIconStyles,
} from './fileAssetWithPreview.styles';

import {FileAssetOptions} from '../common/fileAssetOptions/fileAssetOptions';
import {FilePreviewModal} from '../common/filePreviewModal/filePreviewModal';

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
  id: string;
}

export const FileAssetWithPreview = ({
  id,
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
  const {translate} = useApplicationContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isInEditMode, setIsInEditMode] = useState(false);

  const hasImagePreview = imagePreviewUrl !== undefined && imagePreviewUrl !== '';
  const shouldDisplayLoading = (hasImagePreview ? !isImageLoaded : isLoading) && !isError;
  const shouldDisplayPreviewError = isError || (!isLoading && !hasImagePreview);

  const showModal = (isEditMode?: boolean) => {
    setIsOpen(true);
    setIsInEditMode(isEditMode === true);
  };

  const hideModal = () => {
    setIsOpen(false);
    setIsInEditMode(false);
  };
  return (
    <FileCard.Root variant="large" extension={extension} name={name} size={size}>
      <FileCard.Header>
        <FileCard.Icon type={isError ? 'unavailable' : 'file'} />
        {!isError && <FileCard.Type />}
        <FileCard.Name variant={isError ? 'secondary' : 'primary'} />
        {!isError && <FileAssetOptions id={id} src={src} name={name} extension={extension} onOpen={showModal} />}
      </FileCard.Header>
      <FileCard.Content>
        <button
          css={contentWrapperStyles}
          onClick={() => showModal()}
          aria-label={translate('cells.options.open')}
          aria-controls={id}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          disabled={isError}
        >
          <img
            src={imagePreviewUrl}
            style={{'--opacity': isImageLoaded && hasImagePreview ? 1 : 0} as CSSProperties}
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
                    {isError ? translate('cells.unavailableFile') : translate('cells.unavailableFilePreview')}
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
        onClose={hideModal}
        isLoading={isLoading}
        isError={isError}
        isEditMode={isInEditMode}
      />
    </FileCard.Root>
  );
};
