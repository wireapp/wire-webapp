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

import type {FireAndForgetInvoker} from '@wireapp/core';

import type {SharedDriveUploadController} from './sharedDriveUploadController';
import {
  getSharedDriveDropRejectionFeedback,
  handleSharedDriveDroppedFiles,
  validateSharedDriveDroppedFiles,
} from './sharedDriveDrop';

const rootUploadPath = 'conversation-id@example.com';
const nestedUploadPath = 'conversation-id@example.com/Marketing/Briefs';
const maxFileSize = 100;

function createDependencies(options: Partial<Parameters<typeof handleSharedDriveDroppedFiles>[1]> = {}) {
  const fireAndForgetInvoker: FireAndForgetInvoker = {
    fireAndForget: jest.fn(),
    waitUntilAllSettled: jest.fn().mockResolvedValue(undefined),
  };
  const sharedDriveUploadController = {
    upload: jest.fn().mockResolvedValue(undefined),
  } as unknown as SharedDriveUploadController;
  const onRefresh = jest.fn();
  const onReject = jest.fn();

  return {
    fireAndForgetInvoker,
    sharedDriveUploadController,
    uploadPath: rootUploadPath,
    onRefresh,
    onReject,
    isUploadFilesEnabled: true,
    isInRecycleBin: false,
    maxFileSize,
    isAcceptedFile: jest.fn(() => true),
    ...options,
  };
}

describe('handleSharedDriveDroppedFiles', () => {
  it('starts direct upload for one accepted file at the root target path', async () => {
    const file = new File(['content'], 'document.txt', {type: 'text/plain'});
    const dependencies = createDependencies();

    handleSharedDriveDroppedFiles([file], dependencies);

    expect(dependencies.onReject).not.toHaveBeenCalled();
    expect(dependencies.fireAndForgetInvoker.fireAndForget).toHaveBeenCalledTimes(1);
    const uploadAction = jest.mocked(dependencies.fireAndForgetInvoker.fireAndForget).mock.calls[0][0];
    await uploadAction();
    expect(dependencies.sharedDriveUploadController.upload).toHaveBeenCalledWith(
      [file],
      rootUploadPath,
      dependencies.onRefresh,
    );
  });

  it('starts direct upload for one accepted file at a nested target path', async () => {
    const file = new File(['content'], 'brief.txt', {type: 'text/plain'});
    const dependencies = createDependencies({uploadPath: nestedUploadPath});

    handleSharedDriveDroppedFiles([file], dependencies);

    const uploadAction = jest.mocked(dependencies.fireAndForgetInvoker.fireAndForget).mock.calls[0][0];
    await uploadAction();
    expect(dependencies.sharedDriveUploadController.upload).toHaveBeenCalledWith(
      [file],
      nestedUploadPath,
      dependencies.onRefresh,
    );
  });

  it('rejects unsupported input before starting upload', () => {
    const file = new File(['content'], 'blocked.exe', {type: 'application/octet-stream'});
    const dependencies = createDependencies({isAcceptedFile: jest.fn(() => false)});

    handleSharedDriveDroppedFiles([file], dependencies);

    expect(dependencies.onReject).toHaveBeenCalledWith({reason: 'notAccepted', invalidFiles: [file]});
    expect(dependencies.fireAndForgetInvoker.fireAndForget).not.toHaveBeenCalled();
  });

  it('rejects oversized input before starting upload', () => {
    const file = new File(['content'], 'large.txt', {type: 'text/plain'});
    Object.defineProperty(file, 'size', {value: maxFileSize + 1});
    const dependencies = createDependencies();

    handleSharedDriveDroppedFiles([file], dependencies);

    expect(dependencies.onReject).toHaveBeenCalledWith({reason: 'tooLarge', invalidFiles: [file]});
    expect(dependencies.fireAndForgetInvoker.fireAndForget).not.toHaveBeenCalled();
  });

  it('rejects multiple files with clear feedback until multiple upload is supported', () => {
    const firstFile = new File(['one'], 'one.txt');
    const secondFile = new File(['two'], 'two.txt');
    const dependencies = createDependencies();

    handleSharedDriveDroppedFiles([firstFile, secondFile], dependencies);

    expect(dependencies.onReject).toHaveBeenCalledWith({
      reason: 'multipleFiles',
      invalidFiles: [firstFile, secondFile],
    });
    expect(dependencies.fireAndForgetInvoker.fireAndForget).not.toHaveBeenCalled();
  });

  it('keeps the recycle bin from becoming a drop target for an editor', () => {
    const file = new File(['content'], 'document.txt', {type: 'text/plain'});
    const dependencies = createDependencies({isInRecycleBin: true, isUploadFilesEnabled: true});

    handleSharedDriveDroppedFiles([file], dependencies);

    expect(dependencies.onReject).toHaveBeenCalledWith({reason: 'recycleBin', invalidFiles: [file]});
    expect(dependencies.fireAndForgetInvoker.fireAndForget).not.toHaveBeenCalled();
  });

  it('prevents viewers from initiating an upload', () => {
    const file = new File(['content'], 'document.txt', {type: 'text/plain'});
    const dependencies = createDependencies({isUploadFilesEnabled: false});

    handleSharedDriveDroppedFiles([file], dependencies);

    expect(dependencies.onReject).toHaveBeenCalledWith({reason: 'notAllowed', invalidFiles: [file]});
    expect(dependencies.fireAndForgetInvoker.fireAndForget).not.toHaveBeenCalled();
  });
});

describe('validateSharedDriveDroppedFiles', () => {
  it('accepts exactly one valid file', () => {
    const file = new File(['content'], 'document.txt', {type: 'text/plain'});

    expect(
      validateSharedDriveDroppedFiles([file], {
        isUploadFilesEnabled: true,
        isInRecycleBin: false,
        maxFileSize,
        isAcceptedFile: () => true,
      }),
    ).toEqual(expect.objectContaining({isOk: true}));
  });
});

describe('getSharedDriveDropRejectionFeedback', () => {
  it('maps rejection reasons to user-facing feedback', () => {
    const translate = jest.fn((key: string, replacements?: Record<string, string | number>) =>
      replacements ? `${key}:${JSON.stringify(replacements)}` : key,
    );
    const file = new File(['content'], 'document.txt');

    expect(
      getSharedDriveDropRejectionFeedback({reason: 'multipleFiles', invalidFiles: [file]}, translate, maxFileSize),
    ).toEqual({
      title: 'conversationFileUploadFailedTooManyFilesHeading',
      message: 'conversationFileUploadFailedTooManyFilesMessage:{"maxFiles":1}',
      invalidFiles: [file],
    });
  });
});
