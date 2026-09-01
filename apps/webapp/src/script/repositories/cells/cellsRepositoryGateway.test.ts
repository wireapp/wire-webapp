/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import {Task} from 'true-myth';

import {createCellsRepositoryGateway} from './cellsRepositoryGateway';
import type {DraftIdentity, UploadSource} from './upload/identity';
import {createCellsUploadManager} from './upload/manager';

const identity: DraftIdentity = {uploadId: 'local-upload', resourceUuid: 'remote-resource', versionId: 'version-1'};
const source: UploadSource = {
  blob: new File(['content'], 'document.txt', {type: 'text/plain'}),
  name: 'document.txt',
  contentType: 'text/plain',
  size: 7,
};

const createRepository = () => ({
  uploadNodeDraft: jest.fn().mockResolvedValue({uuid: identity.resourceUuid, versionId: identity.versionId}),
  promoteNodeDraft: jest.fn().mockResolvedValue(undefined),
  deleteNodeDraft: jest.fn().mockResolvedValue(undefined),
});

describe('createCellsRepositoryGateway', () => {
  it('forwards the manager identity, path, abort controller, and progress callback', async () => {
    const repository = createRepository();
    const gateway = createCellsRepositoryGateway(repository);
    const controller = new AbortController();
    const onProgress = jest.fn();

    const result = await gateway.uploadDraft({
      uploadId: identity.uploadId,
      attemptId: 'attempt-1',
      identity,
      source,
      path: 'conversation-path',
      signal: controller.signal,
      abortController: controller,
      onProgress,
    });

    expect(result).toMatchObject({
      isOk: true,
      value: {uploadId: identity.uploadId, resourceUuid: identity.resourceUuid, versionId: identity.versionId},
    });
    expect(repository.uploadNodeDraft).toHaveBeenCalledWith({
      uuid: identity.resourceUuid,
      file: source.blob,
      path: 'conversation-path',
      versionId: identity.versionId,
      abortController: controller,
      progressCallback: onProgress,
    });
  });

  it('preserves a repository-returned remote identity while retaining the local upload ID', async () => {
    const repository = createRepository();
    const remoteIdentity = {uuid: 'remote-resource', versionId: 'remote-version'};
    repository.uploadNodeDraft.mockResolvedValueOnce(remoteIdentity);
    const gateway = createCellsRepositoryGateway(repository);
    const controller = new AbortController();

    const result = await gateway.uploadDraft({
      uploadId: identity.uploadId,
      attemptId: 'attempt-1',
      identity,
      source,
      path: 'conversation-path',
      signal: controller.signal,
      abortController: controller,
      onProgress: jest.fn(),
    });

    expect(result).toMatchObject({
      isOk: true,
      value: {uploadId: identity.uploadId, resourceUuid: remoteIdentity.uuid, versionId: remoteIdentity.versionId},
    });
  });

  it('converts a generic Blob while preserving upload metadata and content', async () => {
    const repository = createRepository();
    const gateway = createCellsRepositoryGateway(repository);
    const blobSource: UploadSource = {
      blob: new Blob(['payload'], {type: 'application/octet-stream'}),
      name: 'archive.bin',
      contentType: 'application/octet-stream',
      size: 7,
    };

    const result = await gateway.uploadDraft({
      uploadId: identity.uploadId,
      attemptId: 'attempt-1',
      identity,
      source: blobSource,
      path: 'conversation-path',
      signal: new AbortController().signal,
      abortController: new AbortController(),
      onProgress: jest.fn(),
    });

    const forwardedFile = repository.uploadNodeDraft.mock.calls[0][0].file as File;
    expect(result.isOk).toBe(true);
    expect(forwardedFile).toBeInstanceOf(File);
    expect(forwardedFile.name).toBe('archive.bin');
    expect(forwardedFile.type).toBe('application/octet-stream');
    expect(forwardedFile.size).toBe(7);
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(forwardedFile);
    });
    expect(content).toBe('payload');
  });

  it('maps upload, publish, and discard failures to operation-specific gateway errors', async () => {
    const repository = createRepository();
    repository.uploadNodeDraft.mockRejectedValueOnce(new Error('upload failed'));
    repository.promoteNodeDraft.mockRejectedValueOnce(new Error('publish failed'));
    repository.deleteNodeDraft.mockRejectedValueOnce(new Error('discard failed'));
    const gateway = createCellsRepositoryGateway(repository);
    const request = {
      uploadId: identity.uploadId,
      attemptId: 'attempt-1',
      identity,
      source,
      path: 'conversation-path',
      signal: new AbortController().signal,
      abortController: new AbortController(),
      onProgress: jest.fn(),
    };

    await expect(gateway.uploadDraft(request)).resolves.toMatchObject({
      isErr: true,
      error: {kind: 'gatewayError', operation: 'upload', cause: new Error('upload failed')},
    });
    await expect(gateway.publishDraft(identity)).resolves.toMatchObject({
      isErr: true,
      error: {kind: 'gatewayError', operation: 'publish', cause: new Error('publish failed')},
    });
    await expect(gateway.discardDraft(identity)).resolves.toMatchObject({
      isErr: true,
      error: {kind: 'gatewayError', operation: 'discard', cause: new Error('discard failed')},
    });
  });

  it('maps a synchronous repository throw to a typed upload gateway error', async () => {
    const repository = createRepository();
    const failure = new Error('synchronous upload failure');
    repository.uploadNodeDraft.mockImplementationOnce(() => {
      throw failure;
    });
    const gateway = createCellsRepositoryGateway(repository);

    await expect(
      gateway.uploadDraft({
        uploadId: identity.uploadId,
        attemptId: 'attempt-1',
        identity,
        source,
        path: 'conversation-path',
        signal: new AbortController().signal,
        abortController: new AbortController(),
        onProgress: jest.fn(),
      }),
    ).resolves.toMatchObject({
      isErr: true,
      error: {kind: 'gatewayError', operation: 'upload', cause: failure},
    });
  });

  it('maps an aborted repository request to a typed upload gateway error', async () => {
    const repository = createRepository();
    const controller = new AbortController();
    const abortError = new DOMException('The upload was aborted', 'AbortError');
    controller.abort();
    repository.uploadNodeDraft.mockRejectedValueOnce(abortError);
    const gateway = createCellsRepositoryGateway(repository);

    await expect(
      gateway.uploadDraft({
        uploadId: identity.uploadId,
        attemptId: 'attempt-1',
        identity,
        source,
        path: 'conversation-path',
        signal: controller.signal,
        abortController: controller,
        onProgress: jest.fn(),
      }),
    ).resolves.toMatchObject({
      isErr: true,
      error: {kind: 'gatewayError', operation: 'upload', cause: abortError},
    });
  });

  it('lets manager cancellation abort the controller forwarded to the repository', async () => {
    let resolveUpload!: () => void;
    const repository = createRepository();
    repository.uploadNodeDraft.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveUpload = () => resolve(undefined);
        }),
    );
    const manager = createCellsUploadManager({
      gateway: createCellsRepositoryGateway(repository),
      createResourceUuid: () => identity.resourceUuid,
      createVersionUuid: () => identity.versionId,
      createAttemptId: () => 'attempt-1',
      createAbortController: () => new AbortController(),
    });

    manager.register(identity.uploadId, source, 'conversation-path');
    const start = manager.start(identity.uploadId);
    await Promise.resolve();
    const controller = repository.uploadNodeDraft.mock.calls[0][0].abortController;

    await manager.cancel(identity.uploadId);
    expect(controller?.signal.aborted).toBe(true);
    resolveUpload();
    await start;
  });

  it('returns successful publish and discard tasks', async () => {
    const repository = createRepository();
    const gateway = createCellsRepositoryGateway(repository);

    expect(await gateway.publishDraft(identity)).toMatchObject({isOk: true, value: undefined});
    expect(await gateway.discardDraft(identity)).toMatchObject({isOk: true, value: undefined});
  });
});
