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

import type {FireAndForgetInvoker} from '@wireapp/core';

import type {Translate} from 'Util/localizerUtil';

import type {SharedDriveUploadController} from './sharedDriveUploadController';

export type SharedDriveDropRejectionReason = 'empty' | 'notAccepted' | 'notAllowed' | 'recycleBin' | 'tooLarge';

export interface SharedDriveDropRejection {
  readonly reason: SharedDriveDropRejectionReason;
  readonly invalidFiles: readonly File[];
}

export interface SharedDriveDropFeedback {
  readonly title: string;
  readonly message: string;
  readonly invalidFiles: File[];
}

interface SharedDriveDropDependencies {
  readonly fireAndForgetInvoker: FireAndForgetInvoker;
  readonly sharedDriveUploadController: SharedDriveUploadController;
  readonly conversationQualifiedId: string;
  readonly uploadPath: string;
  readonly onRefresh: () => void;
  readonly onReject: (rejection: SharedDriveDropRejection) => void;
  readonly isUploadFilesEnabled: boolean;
  readonly isInRecycleBin: boolean;
  readonly maxFileSize: number;
  readonly isAcceptedFile: (file: File) => boolean;
}

// eslint-disable-next-line no-magic-numbers
const BYTES_IN_MEGABYTE = 1024 * 1024;

export const validateSharedDriveDroppedFiles = (
  files: readonly File[],
  {
    isUploadFilesEnabled,
    isInRecycleBin,
    maxFileSize,
    isAcceptedFile,
  }: Pick<SharedDriveDropDependencies, 'isUploadFilesEnabled' | 'isInRecycleBin' | 'maxFileSize' | 'isAcceptedFile'>,
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

  const invalidFiles: File[] = [];
  let firstRejectionReason: Extract<SharedDriveDropRejectionReason, 'notAccepted' | 'tooLarge'> | undefined;

  for (const file of files) {
    if (!isAcceptedFile(file)) {
      invalidFiles.push(file);
      firstRejectionReason ??= 'notAccepted';
      continue;
    }

    if (file.size > maxFileSize) {
      invalidFiles.push(file);
      firstRejectionReason ??= 'tooLarge';
    }
  }

  return invalidFiles.length > 0
    ? Result.err({reason: firstRejectionReason ?? 'notAccepted', invalidFiles})
    : Result.ok(undefined);
};

export const handleSharedDriveDroppedFiles = (
  files: readonly File[],
  {
    fireAndForgetInvoker,
    sharedDriveUploadController,
    conversationQualifiedId,
    uploadPath,
    onRefresh,
    onReject,
    isUploadFilesEnabled,
    isInRecycleBin,
    maxFileSize,
    isAcceptedFile,
  }: SharedDriveDropDependencies,
): void => {
  const validation = validateSharedDriveDroppedFiles(files, {
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

export const getSharedDriveDropRejectionFeedback = (
  {reason, invalidFiles}: SharedDriveDropRejection,
  translate: Translate,
  maxFileSize: number,
): SharedDriveDropFeedback => {
  if (reason === 'tooLarge') {
    return {
      title: translate('conversationFileUploadFailedTooLargeFilesHeading'),
      message: translate('conversationFileUploadFailedTooLargeFilesMessage', {
        maxSize: maxFileSize / BYTES_IN_MEGABYTE,
      }),
      invalidFiles: [...invalidFiles],
    };
  }

  if (reason === 'notAccepted') {
    return {
      title: translate('conversationFileUploadFailedHeading'),
      message: translate('sharedDriveDropUnsupportedFileMessage'),
      invalidFiles: [...invalidFiles],
    };
  }

  if (reason === 'recycleBin') {
    return {
      title: translate('conversationFileUploadFailedHeading'),
      message: translate('sharedDriveDropRecycleBinMessage'),
      invalidFiles: [],
    };
  }

  if (reason === 'notAllowed') {
    return {
      title: translate('conversationFileUploadRestrictedOverlayTitle'),
      message: translate('conversationFileUploadRestrictedOverlayDescription'),
      invalidFiles: [],
    };
  }

  return {
    title: translate('conversationFileUploadFailedHeading'),
    message: translate('conversationFileUploadFailedMessage'),
    invalidFiles: [],
  };
};
