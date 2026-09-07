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

import type {UploadSource} from 'Repositories/cells/upload';
import type {CellsUploadManager} from 'Repositories/cells/upload/manager';
import {Result} from 'true-myth';

import {createSharedDriveUploadController} from './sharedDriveUploadController';

const uploadPath = 'conversation-id@example.com/files';
const conversationQualifiedId = 'conversation-id@example.com';

function createCellsRepository() {
  return {
    uploadNode: jest.fn().mockResolvedValue({uuid: 'remote-id', versionId: 'version-id'}),
  };
}

function createController(cellsRepository = createCellsRepository()) {
  const controller = createSharedDriveUploadController({
    mode: 'direct',
    cellsRepository,
    createAbortController: () => new AbortController(),
    createUploadId: jest.fn().mockReturnValueOnce('upload-1').mockReturnValueOnce('upload-2'),
    createSource: jest.fn((file: File): UploadSource => ({
      blob: file,
      name: file.name,
      contentType: file.type,
      size: file.size,
    })),
  });
  return {cellsRepository, controller};
}

function createDraftManager(): jest.Mocked<CellsUploadManager> {
  const source: UploadSource = {blob: new Blob(['data']), name: 'one.txt', contentType: 'text/plain', size: 3};
  const state = {kind: 'published', identity: {uploadId: 'upload-1', resourceUuid: 'remote-id', versionId: 'version-id'}, source};

  return {
    register: jest.fn().mockReturnValue(Result.ok(undefined)),
    snapshot: jest.fn().mockReturnValue(Result.ok(state)),
    subscribe: jest.fn().mockReturnValue(Result.ok(jest.fn())),
    start: jest.fn().mockResolvedValue(Result.ok(undefined)),
    cancel: jest.fn().mockResolvedValue(Result.ok(undefined)),
    retryUpload: jest.fn().mockResolvedValue(Result.ok(undefined)),
    publish: jest.fn().mockResolvedValue(Result.ok(undefined)),
    retryPublish: jest.fn().mockResolvedValue(Result.ok(undefined)),
    discard: jest.fn().mockResolvedValue(Result.ok(undefined)),
    retryDiscard: jest.fn().mockResolvedValue(Result.ok(undefined)),
    release: jest.fn().mockReturnValue(Result.ok(undefined)),
  };
}

function createDraftController(manager = createDraftManager()) {
  const controller = createSharedDriveUploadController({
    mode: 'draft',
    manager,
    createUploadId: jest.fn().mockReturnValue('upload-1'),
    createSource: jest.fn((sourceFile: File): UploadSource => ({
      blob: sourceFile,
      name: sourceFile.name,
      contentType: sourceFile.type,
      size: sourceFile.size,
    })),
  });

  return {controller, manager};
}

describe('createSharedDriveUploadController', () => {
  it('notifies listeners as soon as a file is registered', async () => {
    const {controller} = createController();
    const listener = jest.fn();
    controller.subscribe(listener);

    const uploadPromise = controller.upload(
      [new File(['one'], 'one.txt')],
      uploadPath,
      jest.fn(),
      conversationQualifiedId,
    );

    expect(listener).toHaveBeenCalled();
    expect(controller.snapshots(conversationQualifiedId)).toEqual([
      expect.objectContaining({identity: {uploadId: 'upload-1'}, kind: 'uploading'}),
    ]);

    await uploadPromise;
  });

  it('directly uploads files and refreshes after successful files', async () => {
    const {cellsRepository, controller} = createController();
    const onRefresh = jest.fn();
    const listener = jest.fn();
    const files = [new File(['one'], 'one.txt'), new File(['two'], 'two.txt')];
    controller.subscribe(listener);

    await controller.upload(files, uploadPath, onRefresh, conversationQualifiedId);

    expect(cellsRepository.uploadNode).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({uuid: 'upload-1', file: files[0], path: uploadPath}),
    );
    expect(cellsRepository.uploadNode).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({uuid: 'upload-2', file: files[1], path: uploadPath}),
    );
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalled();
    expect(controller.snapshots(conversationQualifiedId)).toEqual([
      expect.objectContaining({identity: expect.objectContaining({uploadId: 'upload-1'}), kind: 'published'}),
      expect.objectContaining({identity: expect.objectContaining({uploadId: 'upload-2'}), kind: 'published'}),
    ]);
  });

  it('does not refresh when a direct upload fails', async () => {
    const cellsRepository = createCellsRepository();
    cellsRepository.uploadNode.mockRejectedValueOnce(new Error('upload failed'));
    const {controller} = createController(cellsRepository);
    const onRefresh = jest.fn();

    await controller.upload([new File(['one'], 'one.txt')], uploadPath, onRefresh, conversationQualifiedId);

    expect(onRefresh).not.toHaveBeenCalled();
    expect(controller.snapshots(conversationQualifiedId)).toEqual([
      expect.objectContaining({identity: {uploadId: 'upload-1'}, kind: 'uploadFailed'}),
    ]);
  });

  it('cancels an active direct upload', async () => {
    const cellsRepository = createCellsRepository();
    let rejectUpload: (error: unknown) => void = () => undefined;
    cellsRepository.uploadNode.mockImplementationOnce(
      ({abortController}: {abortController?: AbortController}) =>
        new Promise((_resolve, reject) => {
          rejectUpload = reject;
          abortController?.signal.addEventListener('abort', () => reject(new Error('cancelled')));
        }),
    );
    const {controller} = createController(cellsRepository);

    const uploadPromise = controller.upload(
      [new File(['one'], 'one.txt')],
      uploadPath,
      jest.fn(),
      conversationQualifiedId,
    );

    await controller.cancel('upload-1');
    rejectUpload(new Error('cancelled'));
    await uploadPromise;

    expect(controller.snapshots(conversationQualifiedId)).toEqual([
      expect.objectContaining({identity: expect.objectContaining({uploadId: 'upload-1'}), kind: 'cancelled'}),
    ]);
  });

  it('retries a failed direct upload', async () => {
    const cellsRepository = createCellsRepository();
    cellsRepository.uploadNode
      .mockRejectedValueOnce(new Error('upload failed'))
      .mockResolvedValueOnce({uuid: 'remote-id', versionId: 'version-id'});
    const {controller} = createController(cellsRepository);
    const file = new File(['one'], 'one.txt');

    await controller.upload([file], uploadPath, jest.fn(), conversationQualifiedId);
    await controller.retryUpload('upload-1');

    expect(cellsRepository.uploadNode).toHaveBeenCalledTimes(2);
    expect(cellsRepository.uploadNode).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({uuid: 'upload-1', file, path: uploadPath}),
    );
    expect(controller.snapshots(conversationQualifiedId)).toEqual([
      expect.objectContaining({identity: expect.objectContaining({uploadId: 'upload-1'}), kind: 'published'}),
    ]);
  });

  it('does not retry an already published direct upload', async () => {
    const {cellsRepository, controller} = createController();

    await controller.upload([new File(['one'], 'one.txt')], uploadPath, jest.fn(), conversationQualifiedId);
    await controller.retryUpload('upload-1');

    expect(cellsRepository.uploadNode).toHaveBeenCalledTimes(1);
  });

  it('returns only uploads belonging to the requested conversation', async () => {
    const {controller} = createController();
    const onRefresh = jest.fn();

    await controller.upload([new File(['one'], 'one.txt')], uploadPath, onRefresh, conversationQualifiedId);
    await controller.upload([new File(['two'], 'two.txt')], uploadPath, onRefresh, 'other-conversation@example.com');

    expect(controller.snapshots(conversationQualifiedId)).toEqual([
      expect.objectContaining({identity: expect.objectContaining({uploadId: 'upload-1'})}),
    ]);
    expect(controller.snapshots('other-conversation@example.com')).toEqual([
      expect.objectContaining({identity: expect.objectContaining({uploadId: 'upload-2'})}),
    ]);
  });

  it('can run with the draft manager strategy for staged uploads', async () => {
    const onRefresh = jest.fn();
    const file = new File(['one'], 'one.txt', {type: 'text/plain'});
    const {controller, manager} = createDraftController();

    await controller.upload([file], uploadPath, onRefresh, conversationQualifiedId);

    expect(manager.register).toHaveBeenCalledWith('upload-1', expect.objectContaining({name: 'one.txt'}), uploadPath);
    expect(manager.start).toHaveBeenCalledWith('upload-1');
    expect(manager.publish).toHaveBeenCalledWith('upload-1');
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(controller.snapshots(conversationQualifiedId)).toEqual([
      expect.objectContaining({identity: expect.objectContaining({uploadId: 'upload-1'}), kind: 'published'}),
    ]);
  });

  it('does not publish draft uploads when start fails', async () => {
    const manager = createDraftManager();
    manager.start.mockResolvedValueOnce(Result.err({kind: 'unknownUpload', uploadId: 'upload-1'}));
    const {controller} = createDraftController(manager);
    const onRefresh = jest.fn();

    await controller.upload([new File(['one'], 'one.txt')], uploadPath, onRefresh, conversationQualifiedId);

    expect(manager.publish).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('does not start draft uploads when register fails', async () => {
    const manager = createDraftManager();
    manager.register.mockReturnValueOnce(Result.err({kind: 'duplicateUpload', uploadId: 'upload-1'}));
    const {controller} = createDraftController(manager);
    const onRefresh = jest.fn();

    await controller.upload([new File(['one'], 'one.txt')], uploadPath, onRefresh, conversationQualifiedId);

    expect(manager.start).not.toHaveBeenCalled();
    expect(manager.publish).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('does not refresh when draft publish fails', async () => {
    const manager = createDraftManager();
    manager.publish.mockResolvedValueOnce(Result.err({kind: 'unknownUpload', uploadId: 'upload-1'}));
    const {controller} = createDraftController(manager);
    const onRefresh = jest.fn();

    await controller.upload([new File(['one'], 'one.txt')], uploadPath, onRefresh, conversationQualifiedId);

    expect(manager.start).toHaveBeenCalledWith('upload-1');
    expect(manager.publish).toHaveBeenCalledWith('upload-1');
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
