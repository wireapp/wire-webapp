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

import {act, renderHook} from '@testing-library/react';

import type {FireAndForgetInvoker} from '@wireapp/core';

import {Config} from 'src/script/Config';
import {translateForTest} from 'Util/test/translateForTest';

import type {SharedDriveUploadController} from './sharedDriveUploadController';
import {useSharedDriveFileDrop} from './useSharedDriveFileDrop';

const uploadPath = 'conversation-id@example.com';

const createFireAndForgetInvoker = (): FireAndForgetInvoker => ({
  fireAndForget: jest.fn(),
  waitUntilAllSettled: jest.fn().mockResolvedValue(undefined),
});

const createSharedDriveUploadController = (): SharedDriveUploadController =>
  ({
    upload: jest.fn().mockResolvedValue(undefined),
  }) as unknown as SharedDriveUploadController;

describe('useSharedDriveFileDrop', () => {
  const defaultConfiguration = Config.getConfig();

  beforeEach(() => {
    jest.spyOn(Config, 'getConfig').mockReturnValue({
      ...defaultConfiguration,
      FEATURE: {
        ...defaultConfiguration.FEATURE,
        ALLOWED_FILE_UPLOAD_EXTENSIONS: ['.pdf'],
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects a dropped file that is not allowed by the restrictive upload extension config', () => {
    const fireAndForgetInvoker = createFireAndForgetInvoker();
    const sharedDriveUploadController = createSharedDriveUploadController();
    const showFileDropzoneError = jest.fn();
    const onRefresh = jest.fn();
    const file = new File(['content'], 'malware.exe', {type: 'application/octet-stream'});
    const {result} = renderHook(() =>
      useSharedDriveFileDrop({
        fireAndForgetInvoker,
        isInRecycleBin: false,
        isUploadFilesEnabled: true,
        onRefresh,
        sharedDriveUploadController,
        showFileDropzoneError,
        translate: translateForTest,
        uploadPath,
      }),
    );

    act(() => result.current([file]));

    expect(fireAndForgetInvoker.fireAndForget).not.toHaveBeenCalled();
    expect(sharedDriveUploadController.upload).not.toHaveBeenCalled();
    expect(showFileDropzoneError).toHaveBeenCalledWith(
      expect.objectContaining({
        invalidFiles: [file],
        message: 'sharedDriveDropUnsupportedFileMessage',
        title: 'conversationFileUploadFailedHeading',
      }),
    );
  });

  it('starts upload for a dropped file that is allowed by the restrictive upload extension config', async () => {
    const fireAndForgetInvoker = createFireAndForgetInvoker();
    const sharedDriveUploadController = createSharedDriveUploadController();
    const showFileDropzoneError = jest.fn();
    const onRefresh = jest.fn();
    const file = new File(['content'], 'document.pdf', {type: 'application/pdf'});
    const {result} = renderHook(() =>
      useSharedDriveFileDrop({
        fireAndForgetInvoker,
        isInRecycleBin: false,
        isUploadFilesEnabled: true,
        onRefresh,
        sharedDriveUploadController,
        showFileDropzoneError,
        translate: translateForTest,
        uploadPath,
      }),
    );

    act(() => result.current([file]));

    expect(showFileDropzoneError).not.toHaveBeenCalled();
    expect(fireAndForgetInvoker.fireAndForget).toHaveBeenCalledTimes(1);
    const uploadAction = jest.mocked(fireAndForgetInvoker.fireAndForget).mock.calls[0][0];
    await uploadAction();
    expect(sharedDriveUploadController.upload).toHaveBeenCalledWith([file], uploadPath, onRefresh);
  });
});
