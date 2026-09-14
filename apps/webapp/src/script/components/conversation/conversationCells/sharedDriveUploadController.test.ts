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
import {createCellsUploadManager, type CellsUploadManager} from 'Repositories/cells/upload/manager';
import type {CellsUploadGateway, CellsUploadGatewayError, UploadDraftRequest} from 'Repositories/cells/upload/gateway';
import type {DraftIdentity} from 'Repositories/cells/upload/identity';
import {Result, Task} from 'true-myth';

import {
  createDirectSharedDriveUploadStrategy,
  createDraftSharedDriveUploadStrategy,
  createSharedDriveUploadController,
  type SharedDriveUploadStrategy,
} from './sharedDriveUploadController';

const uploadPath = 'conversation-id@example.com/files';
const conversationQualifiedId = 'conversation-id@example.com';

function createCellsRepositoryMock() {
  return {
    uploadNode: jest.fn().mockResolvedValue({uuid: 'remote-id', versionId: 'version-id'}),
  };
}

function createDirectUploadControllerHelper(
  cellsRepository = createCellsRepositoryMock(),
  createUploadId = jest.fn().mockReturnValueOnce('upload-1').mockReturnValueOnce('upload-2'),
) {
  const createSource = jest.fn((file: File): UploadSource => ({
    blob: file,
    name: file.name,
    contentType: file.type,
    size: file.size,
  }));
  const controller = createSharedDriveUploadController({
    createUploadId,
    createSource,
    uploadStrategy: createDirectSharedDriveUploadStrategy({
      cellsRepository,
      createAbortController: () => new AbortController(),
      createSource,
    }),
  });
  return {cellsRepository, controller};
}

function createDraftUploadManagerMock(): jest.Mocked<CellsUploadManager> {
  const source: UploadSource = {blob: new Blob(['data']), name: 'one.txt', contentType: 'text/plain', size: 3};
  const state = {
    kind: 'published',
    identity: {uploadId: 'upload-1', resourceUuid: 'remote-id', versionId: 'version-id'},
    source,
  };

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

function createDraftUploadControllerHelper<T extends CellsUploadManager = jest.Mocked<CellsUploadManager>>(
  manager: T = createDraftUploadManagerMock() as T,
  createUploadId: jest.Mock = jest.fn().mockReturnValue('upload-1'),
): {controller: ReturnType<typeof createSharedDriveUploadController>; manager: T} {
  const controller = createSharedDriveUploadController({
    createUploadId,
    createSource: jest.fn((sourceFile: File): UploadSource => ({
      blob: sourceFile,
      name: sourceFile.name,
      contentType: sourceFile.type,
      size: sourceFile.size,
    })),
    uploadStrategy: createDraftSharedDriveUploadStrategy({manager}),
  });

  return {controller, manager};
}

function createDeferredTaskHelper<Value, Failure>(defaultValue: Value) {
  let resolveTask: ((value?: Value) => void) | undefined;
  const value = new Task<Value, Failure>(resolve => {
    resolveTask = nextValue => resolve(nextValue === undefined ? defaultValue : nextValue);
  });

  if (resolveTask === undefined) {
    throw new Error('Deferred task callback was not created');
  }

  return {value, resolve: resolveTask};
}

describe('createSharedDriveUploadController', () => {
  it('notifies listeners as soon as a file is registered', async () => {
    const {controller} = createDirectUploadControllerHelper();
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
    const {cellsRepository, controller} = createDirectUploadControllerHelper();
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

  it('limits overlapping batches to three active uploads and preserves queue order', async () => {
    const cellsRepository = createCellsRepositoryMock();
    const pendingUploads: Array<{resolve: () => void}> = [];
    let activeUploads = 0;
    let maximumActiveUploads = 0;
    cellsRepository.uploadNode.mockImplementation(
      () =>
        new Promise(resolve => {
          activeUploads += 1;
          maximumActiveUploads = Math.max(maximumActiveUploads, activeUploads);
          pendingUploads.push({
            resolve: () => {
              activeUploads -= 1;
              resolve({uuid: 'remote-id', versionId: 'version-id'});
            },
          });
        }),
    );
    let nextUploadId = 0;
    const createUploadId = jest.fn(() => `upload-${++nextUploadId}`);
    const {controller} = createDirectUploadControllerHelper(cellsRepository, createUploadId);
    const files = Array.from({length: 5}, (_, index) => new File([`${index}`], `file-${index}.txt`));

    const uploadPromise = controller.upload(files, uploadPath, jest.fn(), conversationQualifiedId);

    expect(cellsRepository.uploadNode).toHaveBeenCalledTimes(3);
    expect(controller.snapshots(conversationQualifiedId)).toHaveLength(5);
    expect(controller.snapshots(conversationQualifiedId).slice(0, 3)).toEqual(
      expect.arrayContaining([expect.objectContaining({kind: 'uploading'})]),
    );
    expect(controller.snapshots(conversationQualifiedId).slice(3)).toEqual(
      expect.arrayContaining([expect.objectContaining({kind: 'queued'})]),
    );

    pendingUploads[1].resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(cellsRepository.uploadNode).toHaveBeenCalledTimes(4);
    expect(cellsRepository.uploadNode).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({file: files[3]}),
    );
    expect(maximumActiveUploads).toBe(3);

    pendingUploads[0].resolve();
    pendingUploads[2].resolve();
    pendingUploads[3].resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(cellsRepository.uploadNode).toHaveBeenCalledTimes(5);
    pendingUploads[4].resolve();
    await uploadPromise;
    expect(maximumActiveUploads).toBe(3);
  });

  it('cancels queued work without starting it and advances the queue', async () => {
    const cellsRepository = createCellsRepositoryMock();
    const pendingUploads: Array<{resolve: () => void}> = [];
    cellsRepository.uploadNode.mockImplementation(
      () =>
        new Promise(resolve => {
          pendingUploads.push({resolve: () => resolve({uuid: 'remote-id', versionId: 'version-id'})});
        }),
    );
    let nextUploadId = 0;
    const createUploadId = jest.fn(() => `upload-${++nextUploadId}`);
    const {controller} = createDirectUploadControllerHelper(cellsRepository, createUploadId);
    const files = Array.from({length: 5}, (_, index) => new File([`${index}`], `file-${index}.txt`));

    const uploadPromise = controller.upload(files, uploadPath, jest.fn(), conversationQualifiedId);
    await controller.cancel('upload-4');

    expect(cellsRepository.uploadNode).toHaveBeenCalledTimes(3);
    expect(controller.snapshots(conversationQualifiedId)).toEqual([
      expect.objectContaining({identity: {uploadId: 'upload-1'}, kind: 'uploading'}),
      expect.objectContaining({identity: {uploadId: 'upload-2'}, kind: 'uploading'}),
      expect.objectContaining({identity: {uploadId: 'upload-3'}, kind: 'uploading'}),
      expect.objectContaining({identity: {uploadId: 'upload-4'}, kind: 'cancelled'}),
      expect.objectContaining({identity: {uploadId: 'upload-5'}, kind: 'queued'}),
    ]);

    pendingUploads[0].resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(cellsRepository.uploadNode).toHaveBeenCalledTimes(4);
    pendingUploads.slice(1).forEach(upload => upload.resolve());
    await Promise.resolve();
    await Promise.resolve();
    pendingUploads[3]?.resolve();
    await uploadPromise;
  });

  it('does not refresh when a direct upload fails', async () => {
    const cellsRepository = createCellsRepositoryMock();
    cellsRepository.uploadNode.mockRejectedValueOnce(new Error('upload failed'));
    const {controller} = createDirectUploadControllerHelper(cellsRepository);
    const onRefresh = jest.fn();

    await controller.upload([new File(['one'], 'one.txt')], uploadPath, onRefresh, conversationQualifiedId);

    expect(onRefresh).not.toHaveBeenCalled();
    expect(controller.snapshots(conversationQualifiedId)).toEqual([
      expect.objectContaining({identity: {uploadId: 'upload-1'}, kind: 'uploadFailed'}),
    ]);
  });

  it('cancels an active direct upload', async () => {
    const cellsRepository = createCellsRepositoryMock();
    let rejectUpload: (error: unknown) => void = () => undefined;
    cellsRepository.uploadNode.mockImplementationOnce(
      ({abortController}: {abortController?: AbortController}) =>
        new Promise((_resolve, reject) => {
          rejectUpload = reject;
          abortController?.signal.addEventListener('abort', () => reject(new Error('cancelled')));
        }),
    );
    const {controller} = createDirectUploadControllerHelper(cellsRepository);

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

  it('ignores late progress from a cancelled direct upload before the next upload', async () => {
    const cellsRepository = createCellsRepositoryMock();
    let firstProgress: ((progress: number) => void) | undefined;
    cellsRepository.uploadNode.mockImplementationOnce(
      ({
        progressCallback,
        abortController,
      }: {
        progressCallback?: (progress: number) => void;
        abortController?: AbortController;
      }) => {
        firstProgress = progressCallback;
        return new Promise((_resolve, reject) => {
          abortController?.signal.addEventListener('abort', () => reject(new Error('cancelled')));
        });
      },
    );
    const {controller} = createDirectUploadControllerHelper(cellsRepository);

    const firstUpload = controller.upload(
      [new File(['one'], 'one.txt')],
      uploadPath,
      jest.fn(),
      conversationQualifiedId,
    );

    await controller.cancel('upload-1');
    await firstUpload;
    firstProgress?.(0.9);

    expect(controller.snapshots(conversationQualifiedId)).toEqual([
      expect.objectContaining({identity: {uploadId: 'upload-1'}, kind: 'cancelled'}),
    ]);
  });

  it('retries a failed direct upload', async () => {
    const cellsRepository = createCellsRepositoryMock();
    cellsRepository.uploadNode
      .mockRejectedValueOnce(new Error('upload failed'))
      .mockResolvedValueOnce({uuid: 'remote-id', versionId: 'version-id'});
    const {controller} = createDirectUploadControllerHelper(cellsRepository);
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
    const {cellsRepository, controller} = createDirectUploadControllerHelper();

    await controller.upload([new File(['one'], 'one.txt')], uploadPath, jest.fn(), conversationQualifiedId);
    await controller.retryUpload('upload-1');

    expect(cellsRepository.uploadNode).toHaveBeenCalledTimes(1);
  });

  it('returns only uploads belonging to the requested conversation', async () => {
    const {controller} = createDirectUploadControllerHelper();
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
    const {controller, manager} = createDraftUploadControllerHelper();

    await controller.upload([file], uploadPath, onRefresh, conversationQualifiedId);

    expect(manager.register).toHaveBeenCalledWith('upload-1', expect.objectContaining({name: 'one.txt'}), uploadPath);
    expect(manager.start).toHaveBeenCalledWith('upload-1');
    expect(manager.publish).toHaveBeenCalledWith('upload-1');
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(controller.snapshots(conversationQualifiedId)).toEqual([
      expect.objectContaining({identity: expect.objectContaining({uploadId: 'upload-1'}), kind: 'published'}),
    ]);
  });

  it('uploads and promotes multiple draft files as one batch', async () => {
    const manager = createDraftUploadManagerMock();
    const createUploadId = jest.fn().mockReturnValueOnce('upload-1').mockReturnValueOnce('upload-2');
    const {controller} = createDraftUploadControllerHelper(manager, createUploadId);
    const onRefresh = jest.fn();
    const files = [
      new File(['one'], 'one.txt', {type: 'text/plain'}),
      new File(['two'], 'two.txt', {type: 'text/plain'}),
    ];

    await controller.upload(files, uploadPath, onRefresh, conversationQualifiedId);

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
    expect(manager.start).toHaveBeenNthCalledWith(1, 'upload-1');
    expect(manager.publish).toHaveBeenNthCalledWith(1, 'upload-1');
    expect(manager.start).toHaveBeenNthCalledWith(2, 'upload-2');
    expect(manager.publish).toHaveBeenNthCalledWith(2, 'upload-2');
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('registers and starts every file in a batch immediately', async () => {
    const resolveUploadById = new Map<string, (succeeded: boolean) => void>();
    const uploadStrategy: SharedDriveUploadStrategy = {
      register: jest.fn().mockReturnValue(Result.ok(undefined)),
      attach: jest.fn(),
      run: jest.fn(uploadId => {
        return new Promise<boolean>(resolve => {
          resolveUploadById.set(uploadId, resolve);
        });
      }),
      snapshot: jest.fn(),
      cancel: jest.fn().mockResolvedValue(undefined),
      retryUpload: jest.fn().mockResolvedValue(false),
      retryPublish: jest.fn().mockResolvedValue(undefined),
      discard: jest.fn().mockResolvedValue(undefined),
      retryDiscard: jest.fn().mockResolvedValue(undefined),
    };
    const batchController = createSharedDriveUploadController({
      createUploadId: jest
        .fn()
        .mockReturnValueOnce('upload-1')
        .mockReturnValueOnce('upload-2')
        .mockReturnValueOnce('upload-3')
        .mockReturnValueOnce('upload-4'),
      createSource: file => ({blob: file, name: file.name, contentType: file.type, size: file.size}),
      uploadStrategy,
    });
    const uploadPromise = batchController.upload(
      [
        new File(['one'], 'one.txt'),
        new File(['two'], 'two.txt'),
        new File(['three'], 'three.txt'),
        new File(['four'], 'four.txt'),
      ],
      uploadPath,
      jest.fn(),
      conversationQualifiedId,
    );

    expect(uploadStrategy.register).toHaveBeenCalledTimes(4);
    expect(uploadStrategy.run).toHaveBeenCalledTimes(4);

    resolveUploadById.get('upload-1')?.(true);
    resolveUploadById.get('upload-2')?.(true);
    resolveUploadById.get('upload-3')?.(true);
    resolveUploadById.get('upload-4')?.(true);
    await uploadPromise;
  });

  it('ignores late progress from a cancelled upload when the next upload starts', async () => {
    const uploadRequests: UploadDraftRequest[] = [];
    const uploadTasks: Array<{resolve: (value?: DraftIdentity) => void}> = [];
    const remoteIdentity: DraftIdentity = {
      uploadId: 'remote-upload',
      resourceUuid: 'remote-resource',
      versionId: 'remote-version',
    };
    const gateway: CellsUploadGateway = {
      uploadDraft: request => {
        uploadRequests.push(request);
        const deferred = createDeferredTaskHelper<DraftIdentity, CellsUploadGatewayError<'upload'>>(remoteIdentity);
        uploadTasks.push(deferred);
        return deferred.value;
      },
      publishDraft: () => Task.resolve<void, never>(undefined),
      discardDraft: () => Task.resolve<void, never>(undefined),
    };
    const manager = createCellsUploadManager({
      gateway,
      createResourceUuid: () => 'resource-1',
      createVersionUuid: () => 'version-1',
      createAttemptId: () => 'attempt-1',
      createAbortController: () => new AbortController(),
    });
    const createUploadId = jest.fn().mockReturnValueOnce('upload-1').mockReturnValueOnce('upload-2');
    const {controller} = createDraftUploadControllerHelper(manager, createUploadId);
    const firstUpload = controller.upload(
      [new File(['one'], 'one.txt')],
      uploadPath,
      jest.fn(),
      conversationQualifiedId,
    );

    expect(uploadRequests).toHaveLength(1);
    await controller.cancel('upload-1');
    uploadRequests[0].onProgress(0.9);

    const secondUpload = controller.upload(
      [new File(['two'], 'two.txt')],
      uploadPath,
      jest.fn(),
      conversationQualifiedId,
    );
    expect(uploadRequests).toHaveLength(2);
    uploadRequests[1].onProgress(0.1);
    uploadRequests[1].onProgress(0.45);
    uploadRequests[1].onProgress(0.8);

    expect(controller.snapshots(conversationQualifiedId)).toEqual([
      expect.objectContaining({identity: {uploadId: 'upload-1'}, kind: 'cancelled'}),
      expect.objectContaining({identity: {uploadId: 'upload-2'}, kind: 'uploading', progress: 0.8}),
    ]);

    uploadTasks[0].resolve();
    uploadTasks[1].resolve();
    await Promise.all([firstUpload, secondUpload]);
  });

  it('does not publish draft uploads when start fails', async () => {
    const manager = createDraftUploadManagerMock();
    manager.start.mockResolvedValueOnce(Result.err({kind: 'unknownUpload', uploadId: 'upload-1'}));
    const {controller} = createDraftUploadControllerHelper(manager);
    const onRefresh = jest.fn();

    await controller.upload([new File(['one'], 'one.txt')], uploadPath, onRefresh, conversationQualifiedId);

    expect(manager.publish).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('does not start draft uploads when register fails', async () => {
    const manager = createDraftUploadManagerMock();
    manager.register.mockReturnValueOnce(Result.err({kind: 'duplicateUpload', uploadId: 'upload-1'}));
    const {controller} = createDraftUploadControllerHelper(manager);
    const onRefresh = jest.fn();

    await controller.upload([new File(['one'], 'one.txt')], uploadPath, onRefresh, conversationQualifiedId);

    expect(manager.start).not.toHaveBeenCalled();
    expect(manager.publish).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('does not refresh when draft publish fails', async () => {
    const manager = createDraftUploadManagerMock();
    manager.publish.mockResolvedValueOnce(Result.err({kind: 'unknownUpload', uploadId: 'upload-1'}));
    const {controller} = createDraftUploadControllerHelper(manager);
    const onRefresh = jest.fn();

    await controller.upload([new File(['one'], 'one.txt')], uploadPath, onRefresh, conversationQualifiedId);

    expect(manager.start).toHaveBeenCalledWith('upload-1');
    expect(manager.publish).toHaveBeenCalledWith('upload-1');
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('publishes and refreshes after retrying a failed draft upload', async () => {
    const manager = createDraftUploadManagerMock();
    const {controller} = createDraftUploadControllerHelper(manager);
    const onRefresh = jest.fn();

    await controller.upload([new File(['one'], 'one.txt')], uploadPath, onRefresh, conversationQualifiedId);
    await controller.retryUpload('upload-1');

    expect(manager.retryUpload).toHaveBeenCalledWith('upload-1');
    expect(manager.publish).toHaveBeenCalledTimes(2);
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });

  it('does not publish or refresh when retrying a draft upload fails', async () => {
    const manager = createDraftUploadManagerMock();
    manager.retryUpload.mockResolvedValueOnce(Result.err({kind: 'unknownUpload', uploadId: 'upload-1'}));
    const {controller} = createDraftUploadControllerHelper(manager);
    const onRefresh = jest.fn();

    await controller.upload([new File(['one'], 'one.txt')], uploadPath, onRefresh, conversationQualifiedId);
    await controller.retryUpload('upload-1');

    expect(manager.publish).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
