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

import {FullscreenModal} from 'Components/FullscreenModal/FullscreenModal';
import {PDFViewer} from 'Components/PdfViewer/PdfViewer';
import {getFileTypeFromExtension} from 'Util/getFileTypeFromExtension/getFileTypeFromExtension';

import {FileHeader} from './FileHeader/FileHeader';
import {ImageFileView} from './ImageFileView/ImageFileView';

interface FileFullscreenModalProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  fileUrl?: string;
  fileName: string;
  fileExtension: string;
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
      <ModalContent fileExtension={fileExtension} fileUrl={fileUrl} senderName={senderName} timestamp={timestamp} />
    </FullscreenModal>
  );
};

interface ModalContentProps {
  fileUrl?: string;
  fileExtension: string;
  senderName: string;
  timestamp: number;
}

const ModalContent = ({fileExtension, fileUrl, senderName, timestamp}: ModalContentProps) => {
  const fileType = getFileTypeFromExtension(fileExtension);

  switch (fileType) {
    case 'image':
      return <ImageFileView src={fileUrl} senderName={senderName} timestamp={timestamp} />;
    case 'pdf':
      return <PDFViewer src={fileUrl} />;
    default:
      return null;
  }
};
