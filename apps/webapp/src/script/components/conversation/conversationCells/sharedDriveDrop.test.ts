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
import {getSharedDriveDropRejectionFeedback, handleSharedDriveDroppedFiles} from './sharedDriveDrop';
import {validateSharedDriveUploadFiles} from './sharedDriveUploadValidation';

const rootUploadPath = 'conversation-id@example.com';
const nestedUploadPath = 'conversation-id@example.com/Marketing/Briefs';
const conversationQualifiedId = 'conversation-id@example.com';
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
    conversationQualifiedId,
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
      conversationQualifiedId,
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
      conversationQualifiedId,
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

  it('starts direct upload for multiple accepted files', async () => {
    const firstFile = new File(['one'], 'one.txt');
    const secondFile = new File(['two'], 'two.txt');
    const dependencies = createDependencies();

    handleSharedDriveDroppedFiles([firstFile, secondFile], dependencies);

    expect(dependencies.onReject).not.toHaveBeenCalled();
    expect(dependencies.fireAndForgetInvoker.fireAndForget).toHaveBeenCalledTimes(1);
    const uploadAction = jest.mocked(dependencies.fireAndForgetInvoker.fireAndForget).mock.calls[0][0];
    await uploadAction();
    expect(dependencies.sharedDriveUploadController.upload).toHaveBeenCalledWith(
      [firstFile, secondFile],
      rootUploadPath,
      dependencies.onRefresh,
      conversationQualifiedId,
    );
  });

  it.each(['.DS_Store', 'Thumbs.db', 'desktop.ini'])(
    'filters filesystem metadata files before uploading dropped files',
    async metadataFileName => {
      const file = new File(['one'], 'one.txt');
      const metadataFile = new File(['metadata'], metadataFileName);
      const dependencies = createDependencies();

      handleSharedDriveDroppedFiles([metadataFile, file], dependencies);

      expect(dependencies.onReject).not.toHaveBeenCalled();
      expect(dependencies.fireAndForgetInvoker.fireAndForget).toHaveBeenCalledTimes(1);
      const uploadAction = jest.mocked(dependencies.fireAndForgetInvoker.fireAndForget).mock.calls[0][0];
      await uploadAction();
      expect(dependencies.sharedDriveUploadController.upload).toHaveBeenCalledWith(
        [file],
        rootUploadPath,
        dependencies.onRefresh,
        conversationQualifiedId,
      );
    },
  );

  it('does not start an upload when only filesystem metadata files are dropped', () => {
    const metadataFiles = [
      new File(['metadata'], '.DS_Store'),
      new File(['metadata'], 'Thumbs.db'),
      new File(['metadata'], 'desktop.ini'),
    ];
    const dependencies = createDependencies();

    handleSharedDriveDroppedFiles(metadataFiles, dependencies);

    expect(dependencies.onReject).not.toHaveBeenCalled();
    expect(dependencies.fireAndForgetInvoker.fireAndForget).not.toHaveBeenCalled();
  });

  it('preserves intentional dotfiles when uploading dropped files', async () => {
    const dotFile = new File(['one'], '.env');
    const dependencies = createDependencies();

    handleSharedDriveDroppedFiles([dotFile], dependencies);

    const uploadAction = jest.mocked(dependencies.fireAndForgetInvoker.fireAndForget).mock.calls[0][0];
    await uploadAction();
    expect(dependencies.sharedDriveUploadController.upload).toHaveBeenCalledWith(
      [dotFile],
      rootUploadPath,
      dependencies.onRefresh,
      conversationQualifiedId,
    );
  });

  it('rejects the whole batch when any dropped file is invalid', () => {
    const validFile = new File(['one'], 'one.txt');
    const invalidFile = new File(['two'], 'two.exe');
    const dependencies = createDependencies({isAcceptedFile: file => file !== invalidFile});

    handleSharedDriveDroppedFiles([validFile, invalidFile], dependencies);

    expect(dependencies.onReject).toHaveBeenCalledWith({reason: 'notAccepted', invalidFiles: [invalidFile]});
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

describe('validateSharedDriveUploadFiles', () => {
  it('accepts valid files', () => {
    const file = new File(['content'], 'document.txt', {type: 'text/plain'});

    expect(
      validateSharedDriveUploadFiles([file], {
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
      getSharedDriveDropRejectionFeedback({reason: 'notAccepted', invalidFiles: [file]}, translate, maxFileSize),
    ).toEqual({
      title: 'conversationFileUploadFailedHeading',
      message: 'sharedDriveDropUnsupportedFileMessage',
      invalidFiles: [file],
    });
  });
});
