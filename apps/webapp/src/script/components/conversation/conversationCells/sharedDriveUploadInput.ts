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

import type {ChangeEvent} from 'react';

import {Result} from 'true-myth';

import type {FireAndForgetInvoker} from '@wireapp/core';

import type {SharedDriveDropRejection} from './sharedDriveDrop';
import type {SharedDriveUploadController} from './sharedDriveUploadController';

type SharedDriveUploadInputDependencies = {
  readonly fireAndForgetInvoker: FireAndForgetInvoker;
  readonly sharedDriveUploadController: SharedDriveUploadController;
  readonly uploadPath: string;
  readonly conversationQualifiedId: string;
  readonly onRefresh: () => void;
  readonly onReject: (rejection: SharedDriveDropRejection) => void;
  readonly isUploadFilesEnabled: boolean;
  readonly isInRecycleBin: boolean;
  readonly maxFileSize: number;
  readonly isAcceptedFile: (file: File) => boolean;
};

const validateSharedDriveUploadInputFiles = (
  files: readonly File[],
  {
    isUploadFilesEnabled,
    isInRecycleBin,
    maxFileSize,
    isAcceptedFile,
  }: Pick<
    SharedDriveUploadInputDependencies,
    'isUploadFilesEnabled' | 'isInRecycleBin' | 'maxFileSize' | 'isAcceptedFile'
  >,
): Result<void, SharedDriveDropRejection> => {
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

export const handleSharedDriveUploadInput = (
  event: ChangeEvent<HTMLInputElement>,
  {
    fireAndForgetInvoker,
    sharedDriveUploadController,
    uploadPath,
    conversationQualifiedId,
    onRefresh,
    onReject,
    isUploadFilesEnabled,
    isInRecycleBin,
    maxFileSize,
    isAcceptedFile,
  }: SharedDriveUploadInputDependencies,
): void => {
  const files = Array.from(event.target.files ?? []);
  event.target.value = '';
  if (files.length === 0) {
    return;
  }

  const validation = validateSharedDriveUploadInputFiles(files, {
    isUploadFilesEnabled,
    isInRecycleBin,
    maxFileSize,
    isAcceptedFile,
  });
  if (validation.isErr) {
    onReject(validation.error);
    return;
  }

  fireAndForgetInvoker.fireAndForget(() =>
    sharedDriveUploadController.upload(files, uploadPath, onRefresh, conversationQualifiedId),
  );
};
