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

  const uploadFile = async (file: FileWithPreview) => {
    // Temporary solution to handle the local development
    // TODO: remove this once we have a proper way to handle the domain per env
    const path =
      process.env.NODE_ENV === 'development'
        ? `${conversation.id}@${CONFIG.CELLS_WIRE_DOMAIN}`
        : `${conversation.qualifiedId.id}@${conversation.qualifiedId.domain}`;

    try {
      const {uuid, versionId} = await cellsRepository.uploadFile({
        uuid: file.id,
        file,
        path,
      });
      updateFile({
        conversationId: conversation.id,
        fileId: file.id,
        data: {remoteUuid: uuid, remoteVersionId: versionId, uploadStatus: 'success'},
      });
    } catch (error) {
      logger.error('Uploading file failed', error);
      updateFile({conversationId: conversation.id, fileId: file.id, data: {uploadStatus: 'error'}});
      throw error;
    }
  };

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

      console.log('acceptedFiles', acceptedFiles);

      const getMediaMetadata = (
        file: File,
      ): Promise<{
        width?: number;
        height?: number;
        duration?: number;
        waveform?: number[];
      }> => {
        return new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = e => {
            if (file.type.startsWith('video/')) {
              const video = document.createElement('video');
              video.onloadedmetadata = () => {
                resolve({
                  width: video.videoWidth,
                  height: video.videoHeight,
                  duration: video.duration,
                });
              };
              video.src = e.target?.result as string;
            } else if (file.type.startsWith('audio/')) {
              const audio = document.createElement('audio');
              audio.onloadedmetadata = () => {
                // Create audio context to analyze the waveform
                const audioContext = new AudioContext();
                const source = audioContext.createMediaElementSource(audio);
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048; // Adjust this value to change the number of samples
                source.connect(analyser);

                // Get the waveform data
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                analyser.getByteTimeDomainData(dataArray);

                // Normalize the waveform data to values between 0 and 1
                const waveform = Array.from(dataArray).map(value => value / 128.0);

                resolve({
                  duration: audio.duration,
                  waveform,
                });
              };
              audio.src = e.target?.result as string;
            } else {
              const img = new Image();
              img.onload = () => {
                resolve({
                  width: img.width,
                  height: img.height,
                });
              };
              img.src = e.target?.result as string;
            }
          };
          reader.readAsDataURL(file);
        });
      };

      const acceptedFilesWithPreview = await Promise.all(
        acceptedFiles.map(async file => {
          const metadata = await getMediaMetadata(file);
          return Object.assign(file, {
            id: createUuid(),
            preview: URL.createObjectURL(file),
            remoteUuid: '',
            remoteVersionId: '',
            uploadStatus: 'uploading' as const,
            width: metadata.width,
            height: metadata.height,
            duration: metadata.duration,
            waveform: metadata.waveform,
          });
        }),
      );

      addFiles({conversationId: conversation.id, files: acceptedFilesWithPreview});

      acceptedFilesWithPreview.forEach(file => {
        void uploadFile(file);
      });
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

  return {getRootProps, getInputProps, open, isDragAccept};
};
