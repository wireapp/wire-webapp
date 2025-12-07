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

import {Accept, FileRejection, useDropzone} from 'react-dropzone';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {Config} from 'src/script/Config';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

import {buildCellFileMetadata} from './buildCellFileMetadata/buildCellFileMetadata';
import {validateFiles, ValidationResult} from './fileValidation/fileValidation';
import {showFileDropzoneErrorModal} from './showFileDropzoneErrorModal/showFileDropzoneErrorModal';
import {transformAcceptedFiles} from './transformAcceptedFiles/transformAcceptedFiles';

import {FileWithPreview, useFileUploadState} from '../useFilesUploadState/useFilesUploadState';
import {checkFileSharingPermission} from '../utils/checkFileSharingPermission';

const MAX_FILES = 10;
const IMAGE_FILE_TYPES = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

const CONFIG = Config.getConfig();

const logger = getLogger('FileDropzone');

interface UseFilesUploadDropzoneParams {
  isTeam: boolean;
  isCellsEnabled: boolean;
  isDisabled: boolean;
  cellsRepository: CellsRepository;
  conversation?: Pick<Conversation, 'id' | 'qualifiedId'>;
}

export const useFilesUploadDropzone = ({
  isTeam,
  isDisabled,
  isCellsEnabled,
  cellsRepository,
  conversation = {id: '', qualifiedId: {id: '', domain: ''}},
}: UseFilesUploadDropzoneParams) => {
  const {addFiles, getFiles, updateFile} = useFileUploadState();
  const files = getFiles({conversationId: conversation.id});

  const [accept, setAccept] = useState<Accept | undefined>(undefined);

  const TEAM_MAX_SIZE = isCellsEnabled ? CONFIG.MAXIMUM_ASSET_FILE_SIZE_CELLS : CONFIG.MAXIMUM_ASSET_FILE_SIZE_TEAM;

  const MAX_SIZE = isTeam ? TEAM_MAX_SIZE : CONFIG.MAXIMUM_ASSET_FILE_SIZE_PERSONAL;

  const {getRootProps, getInputProps, open, isDragAccept} = useDropzone({
    maxSize: MAX_SIZE,
    noClick: true,
    noKeyboard: true,
    disabled: isDisabled,
    accept,
    onDrop: checkFileSharingPermission(async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      await processIncomingFiles(acceptedFiles, rejectedFiles, files, MAX_SIZE, MAX_FILES, conversation.id);
    }),
    onError: (error: Error) => {
      logger.error('Dropping files failed', error);
      showFileDropzoneErrorModal({
        title: t('conversationFileUploadFailedHeading'),
        message: t('conversationFileUploadFailedMessage'),
        invalidFiles: [],
      });
    },
    onFileDialogOpen() {
      // Once the modal is open, we know what files it will accept.
      // After it closes/selects files, we want to reset the state immediately.
      // By resetting the state already at this stage, we are assured that the accept state will not be stale.
      setAccept(undefined);
    },
  });

  const processIncomingFiles = async (
    acceptedFiles: File[],
    rejectedFiles: FileRejection[],
    files: FileWithPreview[],
    maxSize: number,
    maxFiles: number,
    conversationId: string,
  ) => {
    const newFiles = [...acceptedFiles, ...rejectedFiles.map(file => file.file)];

    const validationResult = validateFiles({
      newFiles,
      currentFiles: files,
      maxSize,
      maxFiles,
    });

    if (!validationResult.isValid) {
      const {error, invalidFiles} = validationResult as Extract<ValidationResult, {isValid: false}>;
      showFileDropzoneErrorModal({
        title: error.title,
        message: error.message,
        invalidFiles,
      });
      return;
    }

    const transformedAcceptedFiles = transformAcceptedFiles(acceptedFiles);

    addFiles({conversationId, files: transformedAcceptedFiles});

    await attatchMetadataToFiles(transformedAcceptedFiles);

    await uploadFiles(transformedAcceptedFiles);
  };

  const handlePastedFile = async (file: File) => {
    await processIncomingFiles([file], [], files, MAX_SIZE, MAX_FILES, conversation.id);
  };

  const uploadFile = async (file: FileWithPreview) => {
    // Temporary solution to handle the local development
    // TODO: remove this once we have a proper way to handle the domain per env
    const path =
      process.env.NODE_ENV === 'development'
        ? `${conversation.id}@${CONFIG.CELLS_WIRE_DOMAIN}`
        : `${conversation.qualifiedId.id}@${conversation.qualifiedId.domain}`;

    const decimalMultiplier = 100;

    try {
      const {uuid, versionId} = await cellsRepository.uploadNodeDraft({
        uuid: file.id,
        file,
        path,
        progressCallback: (progress: number) => {
          updateFile({
            conversationId: conversation.id,
            fileId: file.id,
            data: {uploadProgress: progress * decimalMultiplier},
          });
        },
      });

      updateFile({
        conversationId: conversation.id,
        fileId: file.id,
        data: {remoteUuid: uuid, remoteVersionId: versionId, uploadStatus: 'success'},
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      logger.error('Uploading file failed', error);
      updateFile({conversationId: conversation.id, fileId: file.id, data: {uploadStatus: 'error'}});
      throw error;
    }
  };

  const uploadFiles = async (files: FileWithPreview[]) => {
    await Promise.all(
      files.map(async file => {
        await uploadFile(file);
      }),
    );
  };

  const attatchMetadataToFiles = async (files: FileWithPreview[]) => {
    await Promise.all(
      files.map(async file => {
        const metadata = await buildCellFileMetadata(file);

        if (!metadata) {
          return;
        }

        updateFile({
          conversationId: conversation.id,
          fileId: file.id,
          data: {...metadata},
        });
      }),
    );
  };

  // Using setTimeout to ensure state update is processed before opening the file dialog
  // This is necessary because react-dropzone's open() function needs the updated accept state
  const delayedOpen = () => {
    setTimeout(open, 0);
  };

  const openAllFilesView = () => {
    setAccept(undefined);
    delayedOpen();
  };

  const openImageFilesView = () => {
    setAccept({
      'image/*': IMAGE_FILE_TYPES,
    });
    delayedOpen();
  };

  return {getRootProps, getInputProps, openAllFilesView, openImageFilesView, handlePastedFile, isDragAccept};
};
