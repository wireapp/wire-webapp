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

import {useEffect, useId, useState, type FunctionComponent} from 'react';

import {Maybe} from 'true-myth';

import {FileEditor} from './fileEditor/fileEditor';
import {useFileFullscreenModalSourceConversation} from './fileFullscreenModalSourceConversationContext';
import {FileHeader} from './fileHeader/fileHeader';
import {FileLoader} from './fileLoader/fileLoader';
import {ImageFileView} from './imageFileView/imageFileView';
import {NoPreviewAvailable} from './noPreviewAvailable/noPreviewAvailable';
import {PDFViewer} from './pdfViewer/pdfViewer';

import type {Conversation} from '../../repositories/entity/conversation';
import {isFileEditable} from '../../util/fileTypeUtil';
import type {FileType} from '../../util/getFileTypeFromExtension/fileType';
import {getFileTypeFromExtension} from '../../util/getFileTypeFromExtension/getFileTypeFromExtension';
import {getBestPreviewSource} from '../../util/imageUtil';
import {getFileExtensionFromUrl, getFileNameWithExtension} from '../../util/util';
import {
  CELLS_ACTION,
  useCellsActionPermissions,
} from '../conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {isInRecycleBin} from '../conversation/conversationCells/common/recycleBin/recycleBin';
import {FullscreenModal} from '../fullscreenModal/fullscreenModal';

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
  fallbackConversationName?: string;
  sourceConversation?: Conversation;
  badges?: string[];
  isEditMode?: boolean;
  checkIsInRecycleBin?: () => boolean;
  context?: 'cells' | 'chat';
  onDownload?: () => Promise<void> | void;
  previewType?: FileType;
  dialogId?: string;
}

export const FileFullscreenModal: FunctionComponent<FileFullscreenModalProps> = ({
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
  fallbackConversationName,
  sourceConversation,
  badges,
  isEditMode = false,
  checkIsInRecycleBin = isInRecycleBin,
  context = 'cells',
  onDownload,
  previewType,
  dialogId,
}: FileFullscreenModalProps) => {
  const generatedDialogId = useId();
  const modalDomId = dialogId ?? generatedDialogId;
  const sourceConversationFromContext = useFileFullscreenModalSourceConversation();
  const sourceConversationForMetadata = sourceConversation ?? sourceConversationFromContext;
  const isInCellsRecycleBin = context === 'cells' && checkIsInRecycleBin();
  const notInRecycleBin = !isInCellsRecycleBin;
  const canPerformCellsAction = useCellsActionPermissions();
  const canEdit = context === 'cells' && canPerformCellsAction(CELLS_ACTION.EDIT);
  const [isInEditMode, setIsInEditMode] = useState(isEditMode && notInRecycleBin && canEdit);
  const [refreshKey, setRefreshKey] = useState(0);
  const isEditable = isFileEditable(fileExtension);

  const refreshModalContent = (): void => {
    setRefreshKey(prev => {
      return prev + 1;
    });
  };

  const onCloseModal = (): void => {
    setIsInEditMode(false);
    onClose();
  };

  useEffect(() => {
    setIsInEditMode(isEditMode && notInRecycleBin && canEdit);
  }, [canEdit, isEditMode, notInRecycleBin]);

  return (
    <FullscreenModal
      id={modalDomId}
      ariaLabel={getFileNameWithExtension(fileName, fileExtension)}
      isOpen={isOpen}
      onClose={onCloseModal}
    >
      <FileHeader
        onClose={onCloseModal}
        fileName={fileName}
        fileExtension={fileExtension}
        fileUrl={fileUrl}
        senderName={senderName}
        timestamp={timestamp}
        fallbackConversationName={fallbackConversationName}
        sourceConversation={sourceConversationForMetadata}
        badges={badges}
        isInEditMode={isInEditMode}
        onEditModeChange={setIsInEditMode}
        isEditable={isEditable}
        id={id}
        onFileContentRefresh={refreshModalContent}
        showViewOnlyLabel={context === 'cells' && !canEdit}
        context={context}
        onDownload={onDownload}
        autoFocusCloseButton={context === 'chat'}
      />
      {isInEditMode && isEditable ? (
        <FileEditor key={refreshKey} id={id} />
      ) : (
        <ModalContent
          key={refreshKey}
          fileExtension={fileExtension}
          filePreviewUrl={filePreviewUrl}
          fileName={fileName}
          fileUrl={fileUrl}
          senderName={senderName}
          timestamp={timestamp}
          status={status}
          previewType={previewType}
        />
      )}
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
  previewType?: FileType;
}

const ModalContent: FunctionComponent<ModalContentProps> = ({
  fileExtension,
  filePreviewUrl,
  fileName,
  fileUrl,
  senderName,
  timestamp,
  status,
  previewType,
}: ModalContentProps) => {
  if (status === 'loading' && (filePreviewUrl === undefined || filePreviewUrl.length === 0)) {
    return <FileLoader />;
  }

  if (status === 'unavailable' || filePreviewUrl === undefined || filePreviewUrl.length === 0) {
    return <NoPreviewAvailable fileUrl={fileUrl} fileName={fileName} fileExtension={fileExtension} />;
  }

  const extension = getFileExtensionFromUrl(filePreviewUrl);
  const type = previewType ?? getFileTypeFromExtension(extension);

  if (type === 'pdf') {
    return <PDFViewer src={filePreviewUrl} />;
  }

  if (type === 'image') {
    const imageSrc = getBestPreviewSource({
      fileExtension,
      fileUrl: Maybe.of(fileUrl),
      filePreviewUrl: Maybe.of(filePreviewUrl),
    }).unwrapOr(undefined);

    return <ImageFileView src={imageSrc} senderName={senderName} timestamp={timestamp} />;
  }

  return <NoPreviewAvailable fileUrl={fileUrl} fileName={fileName} fileExtension={fileExtension} />;
};
