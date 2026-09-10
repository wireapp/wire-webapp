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

import type {CellsRepository} from 'Repositories/cells/cellsRepository';
import type {UploadSource, UploadState} from 'Repositories/cells/upload';
import type {CellsUploadManager} from 'Repositories/cells/upload/manager';

export type SharedDriveUploadController = {
  readonly upload: (
    files: readonly File[],
    path: string,
    onRefresh: () => void,
    conversationQualifiedId: string,
  ) => Promise<void>;
  readonly snapshots: (conversationQualifiedId: string) => readonly UploadState[];
  readonly subscribe: (listener: () => void) => () => void;
  readonly cancel: (uploadId: string) => Promise<void>;
  readonly retryUpload: (uploadId: string) => Promise<void>;
  readonly retryPublish: (uploadId: string) => Promise<void>;
  readonly discard: (uploadId: string) => Promise<void>;
  readonly retryDiscard: (uploadId: string) => Promise<void>;
};

export type SharedDriveUploadRequest = {
  readonly file: File;
  readonly path: string;
};

type SharedDriveUploadSnapshotListener = () => void;

export type SharedDriveUploadStrategy = {
  readonly register: (uploadId: string, source: UploadSource, path: string) => Result<void, unknown>;
  readonly attach: (uploadId: string, listener: SharedDriveUploadSnapshotListener) => void;
  readonly run: (uploadId: string, request: SharedDriveUploadRequest) => Promise<boolean>;
  readonly snapshot: (uploadId: string) => UploadState | undefined;
  readonly cancel: (uploadId: string) => Promise<void>;
  readonly retryUpload: (uploadId: string) => Promise<boolean>;
  readonly retryPublish: (uploadId: string) => Promise<void>;
  readonly discard: (uploadId: string) => Promise<void>;
  readonly retryDiscard: (uploadId: string) => Promise<void>;
};

type DirectUploadStrategyDependencies = {
  readonly cellsRepository: Pick<CellsRepository, 'uploadNode'>;
  readonly createAbortController: () => AbortController;
  readonly createSource: (file: File) => UploadSource;
};

type DraftUploadStrategyDependencies = {
  readonly manager: CellsUploadManager;
};

type Dependencies = {
  readonly createUploadId: () => string;
  readonly createSource: (file: File) => UploadSource;
  readonly uploadStrategy: SharedDriveUploadStrategy;
};

export const createDraftSharedDriveUploadStrategy = ({
  manager,
}: DraftUploadStrategyDependencies): SharedDriveUploadStrategy => {
  const subscriptions = new Map<string, () => void>();
  const listenersByUploadId = new Map<string, SharedDriveUploadSnapshotListener>();

  const attach = (uploadId: string, listener: SharedDriveUploadSnapshotListener): void => {
    listenersByUploadId.set(uploadId, listener);
    const subscription = manager.subscribe(uploadId, () => listener());
    if (subscription.isOk) {
      subscriptions.set(uploadId, subscription.value);
    }
  };

  const startAndPublishFile = async (uploadId: string): Promise<boolean> => {
    const startResult = await manager.start(uploadId);
    if (startResult.isErr) {
      listenersByUploadId.get(uploadId)?.();
      return false;
    }

    const publishResult = await manager.publish(uploadId);
    listenersByUploadId.get(uploadId)?.();
    return publishResult.isOk;
  };

  const retryUpload = async (uploadId: string): Promise<boolean> => {
    const retryResult = await manager.retryUpload(uploadId);
    if (retryResult.isErr) {
      listenersByUploadId.get(uploadId)?.();
      return false;
    }

    const publishResult = await manager.publish(uploadId);
    listenersByUploadId.get(uploadId)?.();
    return publishResult.isOk;
  };

  const command = async (uploadId: string, action: (id: string) => Promise<unknown>): Promise<void> => {
    await action(uploadId);
    listenersByUploadId.get(uploadId)?.();
  };

  return {
    register: (uploadId, source, path) => manager.register(uploadId, source, path),
    attach,
    run: startAndPublishFile,
    snapshot: uploadId => manager.snapshot(uploadId).unwrapOr(undefined),
    cancel: uploadId => command(uploadId, manager.cancel),
    retryUpload,
    retryPublish: uploadId => command(uploadId, manager.retryPublish),
    discard: uploadId => command(uploadId, manager.discard),
    retryDiscard: uploadId => command(uploadId, manager.retryDiscard),
  };
};

export const createDirectSharedDriveUploadStrategy = ({
  cellsRepository,
  createAbortController,
  createSource,
}: DirectUploadStrategyDependencies): SharedDriveUploadStrategy => {
  const statesByUploadId = new Map<string, UploadState>();
  const requestsByUploadId = new Map<string, SharedDriveUploadRequest>();
  const abortControllersByUploadId = new Map<string, AbortController>();
  const listeners = new Set<SharedDriveUploadSnapshotListener>();
  const notify = () => listeners.forEach(listener => listener());

  const setState = (uploadId: string, state: UploadState): void => {
    statesByUploadId.set(uploadId, state);
    notify();
  };

  const uploadDirectFile = async (uploadId: string, request: SharedDriveUploadRequest): Promise<boolean> => {
    const source = createSource(request.file);
    const abortController = createAbortController();
    abortControllersByUploadId.set(uploadId, abortController);
    setState(uploadId, {kind: 'uploading', identity: {uploadId}, source, progress: 0});

    try {
      const {uuid, versionId} = await cellsRepository.uploadNode({
        uuid: uploadId,
        file: request.file,
        path: request.path,
        progressCallback: progress => {
          if (abortController.signal.aborted || abortControllersByUploadId.get(uploadId) !== abortController) {
            return;
          }

          setState(uploadId, {kind: 'uploading', identity: {uploadId}, source, progress});
        },
        abortController,
      });

      setState(uploadId, {kind: 'published', identity: {uploadId, resourceUuid: uuid, versionId}, source});
      return true;
    } catch (error: unknown) {
      if (abortController.signal.aborted) {
        setState(uploadId, {kind: 'cancelled', identity: {uploadId}, source});
        return false;
      }

      setState(uploadId, {
        kind: 'uploadFailed',
        identity: {uploadId},
        source,
        error: {kind: 'uploadFailed', cause: error},
      });
      return false;
    } finally {
      abortControllersByUploadId.delete(uploadId);
    }
  };

  const retryUpload = async (uploadId: string): Promise<boolean> => {
    const request = requestsByUploadId.get(uploadId);
    const currentState = statesByUploadId.get(uploadId);
    if (!request || currentState?.kind !== 'uploadFailed') {
      return false;
    }

    return uploadDirectFile(uploadId, request);
  };

  return {
    register: (uploadId, source) => {
      setState(uploadId, {kind: 'queued', identity: {uploadId}, source});
      return Result.ok(undefined);
    },
    attach: (_uploadId, listener) => {
      listeners.add(listener);
    },
    run: (uploadId, request) => {
      requestsByUploadId.set(uploadId, request);
      return uploadDirectFile(uploadId, request);
    },
    snapshot: uploadId => statesByUploadId.get(uploadId),
    cancel: async uploadId => {
      abortControllersByUploadId.get(uploadId)?.abort();
    },
    retryUpload,
    retryPublish: async () => undefined,
    discard: async () => undefined,
    retryDiscard: async () => undefined,
  };
};

export const createSharedDriveUploadController = ({createUploadId, createSource, uploadStrategy}: Dependencies) => {
  const ids: string[] = [];
  const conversationByUploadId = new Map<string, string>();
  const requestsByUploadId = new Map<string, SharedDriveUploadRequest>();
  const refreshByUploadId = new Map<string, () => void>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());

  const registerFile = (
    file: File,
    path: string,
    conversationQualifiedId: string,
    onRefresh: () => void,
  ): Result<string, unknown> => {
    const uploadId = createUploadId();
    const source = createSource(file);
    const request = {file, path};
    const registered = uploadStrategy.register(uploadId, source, path);

    if (registered.isErr) {
      return Result.err(registered.error);
    }

    ids.push(uploadId);
    conversationByUploadId.set(uploadId, conversationQualifiedId);
    requestsByUploadId.set(uploadId, request);
    refreshByUploadId.set(uploadId, onRefresh);
    uploadStrategy.attach(uploadId, notify);
    return Result.ok(uploadId);
  };

  const uploadFile = async (
    file: File,
    path: string,
    onRefresh: () => void,
    conversationQualifiedId: string,
  ): Promise<boolean> => {
    const registration = registerFile(file, path, conversationQualifiedId, onRefresh);
    if (registration.isErr) {
      return false;
    }

    const request = requestsByUploadId.get(registration.value);
    return request ? uploadStrategy.run(registration.value, request) : false;
  };

  const upload = async (
    files: readonly File[],
    path: string,
    onRefresh: () => void,
    conversationQualifiedId: string,
  ): Promise<void> => {
    const results = await Promise.all(files.map(file => uploadFile(file, path, onRefresh, conversationQualifiedId)));
    if (results.some(Boolean)) {
      onRefresh();
    }
    notify();
  };

  const snapshots = (conversationQualifiedId: string): readonly UploadState[] =>
    ids.flatMap(id => {
      if (conversationByUploadId.get(id) !== conversationQualifiedId) {
        return [];
      }

      const snapshot = uploadStrategy.snapshot(id);
      return snapshot ? [snapshot] : [];
    });

  return {
    upload,
    snapshots,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    cancel: uploadStrategy.cancel,
    retryUpload: async (id: string): Promise<void> => {
      const succeeded = await uploadStrategy.retryUpload(id);
      if (succeeded) {
        refreshByUploadId.get(id)?.();
      }
      notify();
    },
    retryPublish: uploadStrategy.retryPublish,
    discard: uploadStrategy.discard,
    retryDiscard: uploadStrategy.retryDiscard,
  } satisfies SharedDriveUploadController;
};
