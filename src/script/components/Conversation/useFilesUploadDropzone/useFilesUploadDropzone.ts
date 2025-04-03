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

import {FileRejection, useDropzone} from 'react-dropzone';

import {CellsRepository} from 'src/script/cells/CellsRepository';
import {Config} from 'src/script/Config';
import {Conversation} from 'src/script/entity/Conversation';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {createUuid} from 'Util/uuid';

import {buildCellFileMetadata} from './buildCellFileMetadata/buildCellFileMetadata';
import {validateFiles, ValidationResult} from './fileValidation/fileValidation';
import {showFileDropzoneErrorModal} from './showFileDropzoneErrorModal/showFileDropzoneErrorModal';

import {FileWithPreview, useFileUploadState} from '../useFilesUploadState/useFilesUploadState';
import {checkFileSharingPermission} from '../utils/checkFileSharingPermission';

const MAX_FILES = 10;

const CONFIG = Config.getConfig();

const logger = getLogger('FileDropzone');

interface UseFilesUploadDropzoneParams {
  isTeam: boolean;
  cellsRepository: CellsRepository;
  conversation?: Pick<Conversation, 'id' | 'qualifiedId'>;
}

export const useFilesUploadDropzone = ({
  isTeam,
  cellsRepository,
  conversation = {id: '', qualifiedId: {id: '', domain: ''}},
}: UseFilesUploadDropzoneParams) => {
  const {addFiles, getFiles, updateFile} = useFileUploadState();
  const files = getFiles({conversationId: conversation.id});

  const MAX_SIZE = isTeam ? CONFIG.MAXIMUM_ASSET_FILE_SIZE_TEAM : CONFIG.MAXIMUM_ASSET_FILE_SIZE_PERSONAL;

  const {getRootProps, getInputProps, open, isDragAccept} = useDropzone({
    maxSize: MAX_SIZE,
    noClick: true,
    noKeyboard: true,
    onDrop: checkFileSharingPermission(async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      const newFiles = [...acceptedFiles, ...rejectedFiles.map(file => file.file)];

      const validationResult = validateFiles({
        newFiles,
        currentFiles: files,
        maxSize: MAX_SIZE,
        maxFiles: MAX_FILES,
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

      addFiles({conversationId: conversation.id, files: transformedAcceptedFiles});

      await attatchMetadataToFiles(transformedAcceptedFiles);

      await uploadFiles(transformedAcceptedFiles);
    }),
    onError: (error: Error) => {
      logger.error('Dropping files failed', error);
      showFileDropzoneErrorModal({
        title: t('conversationFileUploadFailedHeading'),
        message: t('conversationFileUploadFailedMessage'),
        invalidFiles: [],
      });
    },
  });

  const uploadFile = async (file: FileWithPreview) => {
    // Temporary solution to handle the local development
    // TODO: remove this once we have a proper way to handle the domain per env
    const path =
      process.env.NODE_ENV === 'development'
        ? `${conversation.id}@${CONFIG.CELLS_WIRE_DOMAIN}`
        : `${conversation.qualifiedId.id}@${conversation.qualifiedId.domain}`;

    try {
      // Check if the file has been canceled before starting the upload
      const currentFiles = getFiles({conversationId: conversation.id});
      const currentFile = currentFiles.find(f => f.id === file.id);

      // If the file is no longer in the state or its status is not 'uploading', it has been canceled
      if (!currentFile || currentFile.uploadStatus !== 'uploading') {
        logger.info('File upload canceled', {fileId: file.id});
        return;
      }

      const {uuid, versionId} = await cellsRepository.uploadFile({
        uuid: file.id,
        file,
        path,
      });

      // Check again if the file has been canceled during the upload
      const updatedFiles = getFiles({conversationId: conversation.id});
      const updatedFile = updatedFiles.find(f => f.id === file.id);

      if (!updatedFile || updatedFile.uploadStatus !== 'uploading') {
        logger.info('File upload canceled after completion', {fileId: file.id});
        // Delete the uploaded file since it was canceled
        if (uuid && versionId) {
          void cellsRepository.deleteFileDraft({uuid, versionId});
        }
        return;
      }

      updateFile({
        conversationId: conversation.id,
        fileId: file.id,
        data: {remoteUuid: uuid, remoteVersionId: versionId, uploadStatus: 'success'},
      });
    } catch (error) {
      // Check if the error is due to cancellation
      if (error instanceof Error && error.name === 'AbortError') {
        logger.info('File upload aborted', {fileId: file.id});
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

  const transformAcceptedFiles = (files: File[]) => {
    return files.map(file => {
      return Object.assign(file, {
        id: createUuid(),
        preview: URL.createObjectURL(file),
        remoteUuid: '',
        remoteVersionId: '',
        uploadStatus: 'uploading' as const,
      });
    });
  };

  return {getRootProps, getInputProps, open, isDragAccept};
};
