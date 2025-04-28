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

import {FileHeader} from './FileHeader/FileHeader';
import {ImageFileView} from './ImageFileView/ImageFileView';
import {NoPreviewAvailable} from './NoPreviewAvailable/NoPreviewAvailable';

interface FileFullscreenModalProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  fileUrl?: string;
  fileName: string;
  fileExtension: string;
  type: 'image' | 'pdf';
  senderName: string;
  timestamp: number;
}

export const FileFullscreenModal = ({
  id,
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileExtension,
  senderName,
  timestamp,
}: FileFullscreenModalProps) => {
  return (
    <FullscreenModal id={id} isOpen={isOpen} onClose={onClose}>
      <FileHeader
        onClose={onClose}
        fileName={fileName}
        fileExtension={fileExtension}
        senderName={senderName}
        timestamp={timestamp}
      />
      <ModalContent
        type={fileExtension === 'pdf' ? 'pdf' : 'image'}
        fileUrl={fileUrl}
        fileName={fileName}
        senderName={senderName}
        timestamp={timestamp}
      />
    </FullscreenModal>
  );
};

interface ModalContentProps {
  fileUrl?: string;
  fileName: string;
  type: 'image' | 'pdf';
  senderName: string;
  timestamp: number;
}

const ModalContent = ({type, fileUrl, fileName, senderName, timestamp}: ModalContentProps) => {
  if (!fileUrl) {
    return <NoPreviewAvailable fileUrl={fileUrl} fileName={fileName} />;
  }

  if (type === 'image') {
    return <ImageFileView src={fileUrl} senderName={senderName} timestamp={timestamp} />;
  }

  if (type === 'pdf') {
    return <PDFViewer src={fileUrl} />;
  }

  return <NoPreviewAvailable fileUrl={fileUrl} fileName={fileName} />;
};
