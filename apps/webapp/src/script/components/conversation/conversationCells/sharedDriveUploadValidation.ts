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

import {Result} from 'true-myth';

export type SharedDriveUploadRejectionReason = 'empty' | 'notAccepted' | 'notAllowed' | 'recycleBin' | 'tooLarge';

export interface SharedDriveUploadRejection {
  readonly reason: SharedDriveUploadRejectionReason;
  readonly invalidFiles: readonly File[];
}

export const isSharedDriveUploadMetadataFile = (file: File): boolean => file.name === '.DS_Store';

export const filterSharedDriveUploadFiles = (files: readonly File[]): File[] =>
  files.filter(file => !isSharedDriveUploadMetadataFile(file));

interface SharedDriveUploadValidationOptions {
  readonly isUploadFilesEnabled: boolean;
  readonly isInRecycleBin: boolean;
  readonly maxFileSize: number;
  readonly isAcceptedFile: (file: File) => boolean;
}

export const validateSharedDriveUploadFiles = (
  files: readonly File[],
  {isUploadFilesEnabled, isInRecycleBin, maxFileSize, isAcceptedFile}: SharedDriveUploadValidationOptions,
): Result<void, SharedDriveUploadRejection> => {
  if (!isUploadFilesEnabled) {
    return Result.err({reason: 'notAllowed', invalidFiles: files});
  }

  if (isInRecycleBin) {
    return Result.err({reason: 'recycleBin', invalidFiles: files});
  }

  if (files.length === 0) {
    return Result.err({reason: 'empty', invalidFiles: []});
  }

  const invalidTypeFiles = files.filter(file => !isAcceptedFile(file));
  if (invalidTypeFiles.length > 0) {
    return Result.err({reason: 'notAccepted', invalidFiles: invalidTypeFiles});
  }

  const oversizedFiles = files.filter(file => file.size > maxFileSize);
  if (oversizedFiles.length > 0) {
    return Result.err({reason: 'tooLarge', invalidFiles: oversizedFiles});
  }

  return Result.ok(undefined);
};
