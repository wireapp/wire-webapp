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

import {render} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type {FireAndForgetInvoker} from '@wireapp/core';

import type {SharedDriveUploadController} from './sharedDriveUploadController';
import {SharedDriveUploadInput} from './sharedDriveUploadInput';

const uploadPath = 'conversation-id@example.com/files';
const conversationQualifiedId = 'conversation-id@example.com';

function createDependencies() {
  const fireAndForgetInvoker: FireAndForgetInvoker = {
    fireAndForget: jest.fn(),
    waitUntilAllSettled: jest.fn().mockResolvedValue(undefined),
  };
  const sharedDriveUploadController = {
    upload: jest.fn().mockResolvedValue(undefined),
  } as unknown as SharedDriveUploadController;
  const onRefresh = jest.fn();

  return {
    conversationQualifiedId,
    fireAndForgetInvoker,
    isAcceptedFile: jest.fn((_file: File) => true),
    isInRecycleBin: false,
    isUploadFilesEnabled: true,
    maxFileSize: 100,
    onRefresh,
    onReject: jest.fn(),
    sharedDriveUploadController,
    uploadPath,
  };
}

function getUploadAction(fireAndForgetInvoker: FireAndForgetInvoker) {
  return jest.mocked(fireAndForgetInvoker.fireAndForget).mock.calls[0][0];
}

describe('SharedDriveUploadInput', () => {
  it('uploads all files selected from the file picker as one batch', async () => {
    const user = userEvent.setup();
    const firstFile = new File(['first'], 'first.txt', {type: 'text/plain'});
    const secondFile = new File(['second'], 'second.txt', {type: 'text/plain'});
    const dependencies = createDependencies();
    const {container} = render(<SharedDriveUploadInput {...dependencies} selectionMode="files" />);

    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInstanceOf(HTMLInputElement);

    await user.upload(input as HTMLInputElement, [firstFile, secondFile]);

    const uploadAction = getUploadAction(dependencies.fireAndForgetInvoker);
    await uploadAction();

    expect(dependencies.sharedDriveUploadController.upload).toHaveBeenCalledWith(
      [firstFile, secondFile],
      uploadPath,
      dependencies.onRefresh,
      conversationQualifiedId,
    );
  });

  it('uploads files selected from a folder with their relative paths', async () => {
    const user = userEvent.setup();
    const firstFile = new File(['first'], 'first.txt', {type: 'text/plain'});
    const secondFile = new File(['second'], 'second.txt', {type: 'text/plain'});
    Object.defineProperty(firstFile, 'webkitRelativePath', {value: 'Reports/first.txt'});
    Object.defineProperty(secondFile, 'webkitRelativePath', {value: 'Reports/Archive/second.txt'});
    const dependencies = createDependencies();
    const {container} = render(<SharedDriveUploadInput {...dependencies} selectionMode="folder" />);

    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(input).toHaveAttribute('directory', '');
    expect(input).toHaveAttribute('webkitdirectory', '');

    await user.upload(input as HTMLInputElement, [firstFile, secondFile]);

    const uploadAction = getUploadAction(dependencies.fireAndForgetInvoker);
    await uploadAction();

    expect(dependencies.sharedDriveUploadController.upload).toHaveBeenCalledWith(
      [firstFile, secondFile],
      uploadPath,
      dependencies.onRefresh,
      conversationQualifiedId,
    );
  });
});
