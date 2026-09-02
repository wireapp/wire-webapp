/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation: either version 3 of the License, or
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

import type {UploadSource} from 'Repositories/cells/upload';
import type {CellsUploadManager, CellsUploadManagerError} from 'Repositories/cells/upload/manager';
import type {UploadSnapshotListener} from 'Repositories/cells/upload/process';

import {createSharedDriveUploadController} from './sharedDriveUploadController';

const uploadPath = 'conversation-id@example.com/files';

function createManager() {
  const manager = {
    register: jest.fn(
      (_uploadId: string, _source: UploadSource, _path: string): Result<void, CellsUploadManagerError> =>
        Result.ok(undefined),
    ),
    subscribe: jest.fn(
      (_uploadId: string, _listener: UploadSnapshotListener): Result<() => void, CellsUploadManagerError> =>
        Result.ok(jest.fn()),
    ),
    start: jest.fn(async (_uploadId: string): Promise<Result<void, CellsUploadManagerError>> => Result.ok(undefined)),
    publish: jest.fn(async (_uploadId: string): Promise<Result<void, CellsUploadManagerError>> => Result.ok(undefined)),
  };
  return manager;
}

function createController(manager: ReturnType<typeof createManager>) {
  const controller = createSharedDriveUploadController({
    manager: manager as unknown as CellsUploadManager,
    createUploadId: jest.fn().mockReturnValueOnce('upload-1').mockReturnValueOnce('upload-2'),
    createSource: jest.fn((file: File): UploadSource => ({
      blob: file,
      name: file.name,
      contentType: file.type,
      size: file.size,
    })),
  });
  return controller;
}

describe('createSharedDriveUploadController', () => {
  it('registers, uploads, publishes, and refreshes after successful files', async () => {
    const manager = createManager();
    const controller = createController(manager);
    const onRefresh = jest.fn();
    const listener = jest.fn();
    const files = [new File(['one'], 'one.txt'), new File(['two'], 'two.txt')];
    controller.subscribe(listener);

    await controller.upload(files, uploadPath, onRefresh);

    expect(manager.register).toHaveBeenNthCalledWith(
      1,
      'upload-1',
      expect.objectContaining({name: 'one.txt'}),
      uploadPath,
    );
    expect(manager.register).toHaveBeenNthCalledWith(
      2,
      'upload-2',
      expect.objectContaining({name: 'two.txt'}),
      uploadPath,
    );
    expect(manager.start).toHaveBeenCalledWith('upload-1');
    expect(manager.start).toHaveBeenCalledWith('upload-2');
    expect(manager.publish).toHaveBeenCalledWith('upload-1');
    expect(manager.publish).toHaveBeenCalledWith('upload-2');
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalled();
  });

  it('does not start a file when registration fails and refreshes after another file succeeds', async () => {
    const manager = createManager();
    manager.register.mockReturnValueOnce(Result.err({kind: 'unknownUpload', uploadId: 'upload-1'}));
    const controller = createController(manager);
    const onRefresh = jest.fn();

    await controller.upload([new File(['one'], 'one.txt'), new File(['two'], 'two.txt')], uploadPath, onRefresh);

    expect(manager.start).toHaveBeenCalledTimes(1);
    expect(manager.start).toHaveBeenCalledWith('upload-2');
    expect(manager.publish).toHaveBeenCalledWith('upload-2');
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not refresh when starting an upload fails', async () => {
    const manager = createManager();
    manager.start.mockResolvedValue(Result.err({kind: 'unknownUpload', uploadId: 'upload-1'}));
    const controller = createController(manager);
    const onRefresh = jest.fn();

    await controller.upload([new File(['one'], 'one.txt')], uploadPath, onRefresh);

    expect(onRefresh).not.toHaveBeenCalled();
    expect(manager.publish).not.toHaveBeenCalled();
  });

  it('does not refresh when publishing an upload fails', async () => {
    const manager = createManager();
    manager.publish.mockResolvedValue(Result.err({kind: 'unknownUpload', uploadId: 'upload-1'}));
    const controller = createController(manager);
    const onRefresh = jest.fn();

    await controller.upload([new File(['one'], 'one.txt')], uploadPath, onRefresh);

    expect(onRefresh).not.toHaveBeenCalled();
  });
});
