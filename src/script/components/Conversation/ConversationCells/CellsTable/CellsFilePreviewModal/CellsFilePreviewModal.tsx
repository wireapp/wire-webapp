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

import {FileFullscreenModal} from 'Components/FileFullscreenModal/FileFullscreenModal';
import {getFileTypeFromExtension} from 'Util/getFileTypeFromExtension/getFileTypeFromExtension';

import {useCellsFilePreviewModal} from '../common/CellsFilePreviewModalContext/CellsFilePreviewModalContext';

// This component is duplicated across global view and conversation view
// TODO: Abstract when it starts to grow / feels right
export const CellsFilePreviewModal = () => {
  const {id, selectedFile, handleCloseFile} = useCellsFilePreviewModal();

  if (!selectedFile) {
    return null;
  }

  const {url, extension, name, owner, uploadedAtTimestamp, previewPdfUrl, previewImageUrl, tags} = selectedFile;

  const getFileUrl = () => {
    const type = getFileTypeFromExtension(extension);

    if (['pdf', 'image'].includes(type)) {
      return url;
    }

    if (['audio', 'video'].includes(type)) {
      return undefined;
    }

    return previewPdfUrl || previewImageUrl;
  };

  return (
    <FileFullscreenModal
      id={id}
      isOpen={!!selectedFile}
      onClose={handleCloseFile}
      filePreviewUrl={getFileUrl()}
      fileName={name}
      fileExtension={extension}
      status={!getFileUrl() ? 'unavailable' : 'success'}
      senderName={owner}
      timestamp={uploadedAtTimestamp}
      badges={tags}
    />
  );
};
