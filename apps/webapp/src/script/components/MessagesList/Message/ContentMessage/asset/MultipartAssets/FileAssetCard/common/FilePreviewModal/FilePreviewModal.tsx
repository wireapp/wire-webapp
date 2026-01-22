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

interface FilePreviewModalProps {
  id: string;
  fileUrl?: string;
  filePdfPreviewUrl?: string;
  fileImagePreviewUrl?: string;
  fileName: string;
  fileExtension: string;
  senderName: string;
  timestamp: number;
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  isError: boolean;
  isEditMode?: boolean;
}

export const FilePreviewModal = ({
  id,
  fileUrl,
  fileName,
  filePdfPreviewUrl,
  fileImagePreviewUrl,
  fileExtension,
  senderName,
  timestamp,
  isOpen,
  onClose,
  isLoading,
  isError,
  isEditMode,
}: FilePreviewModalProps) => {
  const getFileUrl = () => {
    if (fileExtension === 'pdf') {
      return fileUrl;
    }

    return filePdfPreviewUrl || fileImagePreviewUrl;
  };

  const getStatus = () => {
    if (isLoading) {
      return 'loading';
    }

    if (isError || (!getFileUrl() && !isLoading)) {
      return 'unavailable';
    }

    return 'success';
  };

  return (
    <FileFullscreenModal
      id={id}
      filePreviewUrl={getFileUrl()}
      fileUrl={fileUrl}
      fileName={fileName}
      fileExtension={fileExtension}
      senderName={senderName}
      timestamp={timestamp}
      isOpen={isOpen}
      onClose={onClose}
      status={getStatus()}
      isEditMode={isEditMode}
    />
  );
};
