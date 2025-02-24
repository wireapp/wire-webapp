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

import {ReactNode, useEffect} from 'react';

import {FileRejection, useDropzone} from 'react-dropzone';

import {Config} from 'src/script/Config';
import {t} from 'Util/LocalizerUtil';
import {createUuid} from 'Util/uuid';

import {wrapperStyles} from './FileDropzone.styles';
import {showFileDropzoneErrorModal} from './FileDropzoneErrorModal/FileDropzoneErrorModal';
import {FileDropzoneOverlay} from './FileDropzoneOverlay/FileDropzoneOverlay';
import {validateFiles, ValidationResult} from './fileValidation/fileValidation';
import {useIsDragging} from './useIsDragging/useIsDragging';

import {useFileUploadState} from '../useFiles/useFiles';
import {checkFileSharingPermission} from '../utils/checkFileSharingPermission';

interface FileDropzoneProps {
  children: ReactNode;
  isTeam: boolean;
}

const MAX_FILES = 10;

const CONFIG = Config.getConfig();

export const FileDropzone = ({isTeam, children}: FileDropzoneProps) => {
  const {isDragging, wrapperRef} = useIsDragging();

  const {addFiles, files} = useFileUploadState();

  const MAX_SIZE = isTeam ? CONFIG.MAXIMUM_ASSET_FILE_SIZE_TEAM : CONFIG.MAXIMUM_ASSET_FILE_SIZE_PERSONAL;

  const {getRootProps, getInputProps, isDragAccept} = useDropzone({
    maxSize: MAX_SIZE,
    noClick: true,
    noKeyboard: true,
    onDrop: checkFileSharingPermission((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
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

      const acceptedFilesWithPreview = acceptedFiles.map(file => {
        return Object.assign(file, {
          id: createUuid(),
          preview: URL.createObjectURL(file),
        });
      });

      addFiles(acceptedFilesWithPreview);
    }),
    onError: () => {
      showFileDropzoneErrorModal({
        title: t('conversationFileUploadFailedHeading'),
        message: t('conversationFileUploadFailedMessage'),
        invalidFiles: [],
      });
    },
  });

  useEffect(() => {
    // Make sure to revoke the data uris to avoid memory leaks, will run on unmount
    return () => files.forEach(file => URL.revokeObjectURL(file.preview));
  }, [files]);

  return (
    <div ref={wrapperRef} css={wrapperStyles}>
      <div {...getRootProps()}>
        <input {...getInputProps()} />
        <FileDropzoneOverlay isActive={isDragging && isDragAccept} />
        {children}
      </div>
    </div>
  );
};
