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

import type {FireAndForgetInvoker} from '@wireapp/core';

import type {SharedDriveUploadController} from './sharedDriveUploadController';
import {handleSharedDriveUploadInput} from './sharedDriveUploadInput';

const uploadPath = 'conversation-id@example.com/files';
const conversationQualifiedId = 'conversation-id@example.com';

function createEvent(files: readonly File[]): ChangeEvent<HTMLInputElement> {
  return {target: {files, value: 'selected'}} as unknown as ChangeEvent<HTMLInputElement>;
}

function createDependencies() {
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
    onRefresh,
    onReject,
    conversationQualifiedId,
    isUploadFilesEnabled: true,
    isInRecycleBin: false,
    maxFileSize: 100,
    isAcceptedFile: jest.fn((_file: File) => true),
  };
}

function getUploadAction(fireAndForgetInvoker: FireAndForgetInvoker) {
  return (fireAndForgetInvoker.fireAndForget as jest.MockedFunction<FireAndForgetInvoker['fireAndForget']>).mock
    .calls[0][0];
}

describe('handleSharedDriveUploadInput', () => {
  it('resets the input and dispatches selected files for upload', async () => {
    const file = new File(['content'], 'document.txt', {type: 'text/plain'});
    const dependencies = createDependencies();
    const event = createEvent([file]);

    handleSharedDriveUploadInput(event, {...dependencies, uploadPath});

    expect(event.target.value).toBe('');
    expect(dependencies.fireAndForgetInvoker.fireAndForget).toHaveBeenCalledTimes(1);
    const uploadAction = getUploadAction(dependencies.fireAndForgetInvoker);
    await uploadAction();
    expect(dependencies.sharedDriveUploadController.upload).toHaveBeenCalledWith(
      [file],
      uploadPath,
      dependencies.onRefresh,
      conversationQualifiedId,
    );
  });

  it('rejects invalid selected files before dispatching upload', () => {
    const validFile = new File(['valid'], 'valid.txt');
    const invalidFile = new File(['invalid'], 'invalid.exe');
    const dependencies = createDependencies();
    dependencies.isAcceptedFile.mockImplementation(file => file !== invalidFile);

    handleSharedDriveUploadInput(createEvent([validFile, invalidFile]), {...dependencies, uploadPath});

    expect(dependencies.onReject).toHaveBeenCalledWith({reason: 'notAccepted', invalidFiles: [invalidFile]});
    expect(dependencies.fireAndForgetInvoker.fireAndForget).not.toHaveBeenCalled();
  });

  it('rejects oversized selected files before dispatching upload', () => {
    const validFile = new File(['valid'], 'valid.txt');
    const oversizedFile = new File(['oversized'], 'oversized.txt');
    Object.defineProperty(oversizedFile, 'size', {value: 101});
    const dependencies = createDependencies();

    handleSharedDriveUploadInput(createEvent([validFile, oversizedFile]), {...dependencies, uploadPath});

    expect(dependencies.onReject).toHaveBeenCalledWith({reason: 'tooLarge', invalidFiles: [oversizedFile]});
    expect(dependencies.fireAndForgetInvoker.fireAndForget).not.toHaveBeenCalled();
  });

  it('passes upload rejection to the fire-and-forget invoker', async () => {
    const uploadError = new Error('upload failed');
    const dependencies = createDependencies();
    (dependencies.sharedDriveUploadController.upload as jest.Mock).mockRejectedValue(uploadError);

    handleSharedDriveUploadInput(createEvent([new File(['content'], 'document.txt')]), {...dependencies, uploadPath});

    const uploadAction = getUploadAction(dependencies.fireAndForgetInvoker);
    await expect(uploadAction()).rejects.toBe(uploadError);
  });

  it('does not dispatch when no files are selected', () => {
    const dependencies = createDependencies();
    const event = createEvent([]);

    handleSharedDriveUploadInput(event, {...dependencies, uploadPath});

    expect(event.target.value).toBe('');
    expect(dependencies.onReject).not.toHaveBeenCalled();
    expect(dependencies.fireAndForgetInvoker.fireAndForget).not.toHaveBeenCalled();
  });
});
