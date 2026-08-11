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

import {getFilePreviewUrl} from 'Components/cells/common/getFilePreviewUrl/getFilePreviewUrl';
import {FileFullscreenModal} from 'Components/FileFullscreenModal/FileFullscreenModal';
import {viewerPermissionFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {sortTagsAlphabetically} from '../../common/sortTagsAlphabetically/sortTagsAlphabetically';
import {useCellsFilePreviewModal} from '../common/CellsFilePreviewModalContext/CellsFilePreviewModalContext';

// This component is duplicated across global view and conversation view
// TODO: Abstract when it starts to grow / feels right
export const CellsFilePreviewModal = () => {
  const {selectedFile, handleCloseFile, isEditMode} = useCellsFilePreviewModal();
  const {isFeatureToggleEnabled} = useApplicationContext();
  const isModalOpen = selectedFile !== null;

  if (!isModalOpen) {
    return null;
  }

  const {url, extension, name, owner, uploadedAtTimestamp, previewPdfUrl, previewImageUrl, tags} = selectedFile;

  const filePreviewUrl = getFilePreviewUrl({
    extension,
    url,
    previewPdfUrl,
    previewImageUrl,
    enableGuestPdfImagePreview: isFeatureToggleEnabled(viewerPermissionFeatureToggleName),
  });
  const isImagePreview = filePreviewUrl !== undefined && filePreviewUrl === previewImageUrl;

  return (
    <FileFullscreenModal
      id={selectedFile.id}
      isOpen={isModalOpen}
      onClose={handleCloseFile}
      filePreviewUrl={filePreviewUrl}
      isImagePreview={isImagePreview}
      fileName={name}
      fileExtension={extension}
      fileUrl={url}
      status={filePreviewUrl === undefined ? 'unavailable' : 'success'}
      senderName={owner}
      timestamp={uploadedAtTimestamp}
      badges={sortTagsAlphabetically(tags)}
      isEditMode={isEditMode}
    />
  );
};
