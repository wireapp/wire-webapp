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

import {PDFViewer} from 'Components/FileFullscreenModal/PdfViewer/PdfViewer';
import {FullscreenModal} from 'Components/FullscreenModal/FullscreenModal';
import {getFileTypeFromExtension} from 'Util/getFileTypeFromExtension/getFileTypeFromExtension';
import {getFileExtensionFromUrl} from 'Util/util';

import {FileHeader} from './FileHeader/FileHeader';
import {FileLoader} from './FileLoader/FileLoader';
import {ImageFileView} from './ImageFileView/ImageFileView';
import {NoPreviewAvailable} from './NoPreviewAvailable/NoPreviewAvailable';

type Status = 'loading' | 'unavailable' | 'success';

interface FileFullscreenModalProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  filePreviewUrl?: string;
  fileName: string;
  fileExtension: string;
  fileUrl?: string;
  status?: Status;
  senderName: string;
  timestamp: number;
  badges?: string[];
}

export const FileFullscreenModal = ({
  id,
  isOpen,
  onClose,
  filePreviewUrl,
  fileUrl,
  status = 'success',
  fileName,
  fileExtension,
  senderName,
  timestamp,
  badges,
}: FileFullscreenModalProps) => {
  return (
    <FullscreenModal id={id} isOpen={isOpen} onClose={onClose}>
      <FileHeader
        onClose={onClose}
        fileName={fileName}
        fileExtension={fileExtension}
        fileUrl={fileUrl}
        senderName={senderName}
        timestamp={timestamp}
        badges={badges}
      />
      <ModalContent
        fileExtension={fileExtension}
        filePreviewUrl={filePreviewUrl}
        fileName={fileName}
        fileUrl={fileUrl}
        senderName={senderName}
        timestamp={timestamp}
        status={status}
      />
    </FullscreenModal>
  );
};

interface ModalContentProps {
  fileExtension: string;
  fileName: string;
  status: Status;
  senderName: string;
  timestamp: number;
  filePreviewUrl?: string;
  fileUrl?: string;
}

const ModalContent = ({
  fileExtension,
  filePreviewUrl,
  fileName,
  fileUrl,
  senderName,
  timestamp,
  status,
}: ModalContentProps) => {
  if (status === 'loading' && !filePreviewUrl) {
    return <FileLoader />;
  }

  if (status === 'unavailable' || !filePreviewUrl) {
    return <NoPreviewAvailable fileUrl={fileUrl} fileName={fileName} fileExtension={fileExtension} />;
  }

  const extension = getFileExtensionFromUrl(filePreviewUrl);
  const type = getFileTypeFromExtension(extension);

  if (type === 'pdf') {
    return <PDFViewer src={filePreviewUrl} />;
  }

  if (type === 'image') {
    return <ImageFileView src={filePreviewUrl} senderName={senderName} timestamp={timestamp} />;
  }

  return <NoPreviewAvailable fileUrl={fileUrl} fileName={fileName} fileExtension={fileExtension} />;
};
