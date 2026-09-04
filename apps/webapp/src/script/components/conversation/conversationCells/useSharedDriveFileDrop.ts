/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {useCallback} from 'react';

import type {FireAndForgetInvoker} from '@wireapp/core';

import {Config} from 'src/script/Config';
import {isAllowedFile} from 'Util/fileTypeUtil';
import type {Translate} from 'Util/localizerUtil';

import {getSharedDriveDropRejectionFeedback, handleSharedDriveDroppedFiles} from './sharedDriveDrop';
import type {SharedDriveUploadController} from './sharedDriveUploadController';

import {showFileDropzoneErrorModal} from '../useFilesUploadDropzone/showFileDropzoneErrorModal/showFileDropzoneErrorModal';

type ShowFileDropzoneError = typeof showFileDropzoneErrorModal;

const CONFIG = Config.getConfig();

interface UseSharedDriveFileDropParameters {
  readonly conversationQualifiedId: string;
  readonly fireAndForgetInvoker: FireAndForgetInvoker;
  readonly isInRecycleBin: boolean;
  readonly isUploadFilesEnabled: boolean;
  readonly onRefresh: () => void;
  readonly sharedDriveUploadController: SharedDriveUploadController;
  readonly showFileDropzoneError?: ShowFileDropzoneError;
  readonly translate: Translate;
  readonly uploadPath: string;
}

export const useSharedDriveFileDrop = ({
  conversationQualifiedId,
  fireAndForgetInvoker,
  isInRecycleBin,
  isUploadFilesEnabled,
  onRefresh,
  sharedDriveUploadController,
  showFileDropzoneError = showFileDropzoneErrorModal,
  translate,
  uploadPath,
}: UseSharedDriveFileDropParameters): ((files: readonly File[]) => void) =>
  useCallback(
    (files: readonly File[]): void =>
      handleSharedDriveDroppedFiles(files, {
        conversationQualifiedId,
        fireAndForgetInvoker,
        isAcceptedFile: file => isAllowedFile(file.name, file.type),
        isInRecycleBin,
        isUploadFilesEnabled,
        maxFileSize: CONFIG.MAXIMUM_ASSET_FILE_SIZE_CELLS,
        onRefresh,
        onReject: rejection => {
          const feedback = getSharedDriveDropRejectionFeedback(
            rejection,
            translate,
            CONFIG.MAXIMUM_ASSET_FILE_SIZE_CELLS,
          );

          showFileDropzoneError({...feedback, translate});
        },
        sharedDriveUploadController,
        uploadPath,
      }),
    [
      conversationQualifiedId,
      fireAndForgetInvoker,
      isInRecycleBin,
      isUploadFilesEnabled,
      onRefresh,
      sharedDriveUploadController,
      showFileDropzoneError,
      translate,
      uploadPath,
    ],
  );
