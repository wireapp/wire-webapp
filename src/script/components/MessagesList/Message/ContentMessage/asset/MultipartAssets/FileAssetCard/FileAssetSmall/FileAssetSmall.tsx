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
import {t} from 'Util/LocalizerUtil';

import {hollowWrapperButtonStyles} from '../../MultipartAssets.styles';
import {FileAssetOptions} from '../common/FileAssetOptions/FileAssetOptions';
import {FilePreviewModal} from '../common/FilePreviewModal/FilePreviewModal';

interface FileAssetSmallProps {
  src?: string;
  pdfPreviewUrl?: string;
  imagePreviewUrl?: string;
  extension: string;
  name: string;
  size: string;
  isError: boolean;
  senderName: string;
  timestamp: number;
  isLoading: boolean;
  id: string;
}

export const FileAssetSmall = ({
  src,
  extension,
  name,
  size,
  senderName,
  timestamp,
  pdfPreviewUrl,
  imagePreviewUrl,
  isLoading,
  isError,
  id,
}: FileAssetSmallProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const showModal = () => {
    setIsOpen(true);
  };

  return (
    <FileCard.Root extension={extension} name={name} size={size}>
      <button
        onClick={showModal}
        css={hollowWrapperButtonStyles}
        aria-label={t('cells.filePreviewButton.ariaLabel', {name})}
      />
      <FileCard.Header>
        <FileCard.Icon type={isError ? 'unavailable' : 'file'} />
        {!isError && <FileCard.Type />}
        <FileAssetOptions src={src} name={name} extension={extension} onOpen={showModal} />
      </FileCard.Header>
      <FileCard.Name variant={isError ? 'secondary' : 'primary'} truncateAfterLines={2} />
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
        isError={isError}
        isLoading={isLoading}
      />
    </FileCard.Root>
  );
};
