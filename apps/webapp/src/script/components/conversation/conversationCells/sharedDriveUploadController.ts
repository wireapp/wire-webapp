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
import type {UploadSnapshotListener} from 'Repositories/cells/upload/process';

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

type BaseDependencies = {
  readonly createUploadId: () => string;
  readonly createSource: (file: File) => UploadSource;
};

type DirectUploadDependencies = BaseDependencies & {
  readonly mode: 'direct';
  readonly cellsRepository: Pick<CellsRepository, 'uploadNode'>;
  readonly createAbortController: () => AbortController;
};

type DraftUploadDependencies = BaseDependencies & {
  readonly mode: 'draft';
  readonly manager: CellsUploadManager;
};

type Dependencies = DirectUploadDependencies | DraftUploadDependencies;

type UploadRequest = {
  readonly file: File;
  readonly path: string;
  readonly conversationQualifiedId: string;
};

type UploadStrategy = {
  readonly register: (uploadId: string, source: UploadSource, path: string) => Result<void, unknown>;
  readonly attach: (uploadId: string) => void;
  readonly run: (uploadId: string, request: UploadRequest) => Promise<boolean>;
  readonly snapshot: (uploadId: string) => UploadState | undefined;
  readonly cancel: (uploadId: string) => Promise<void>;
  readonly retryUpload: (uploadId: string) => Promise<void>;
  readonly retryPublish: (uploadId: string) => Promise<void>;
  readonly discard: (uploadId: string) => Promise<void>;
  readonly retryDiscard: (uploadId: string) => Promise<void>;
};

export const createSharedDriveUploadController = ({
  mode,
  createUploadId,
  createSource,
  ...dependencies
}: Dependencies) => {
  const ids: string[] = [];
  const conversationByUploadId = new Map<string, string>();
  const statesByUploadId = new Map<string, UploadState>();
  const requestsByUploadId = new Map<string, UploadRequest>();
  const abortControllersByUploadId = new Map<string, AbortController>();
  const subscriptions = new Map<string, () => void>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());

  const setState = (uploadId: string, state: UploadState): void => {
    statesByUploadId.set(uploadId, state);
    notify();
  };

  const createDraftUploadStrategy = ({manager}: DraftUploadDependencies): UploadStrategy => {
    const attach = (uploadId: string): void => {
      const listener: UploadSnapshotListener = () => notify();
      const subscription = manager.subscribe(uploadId, listener);
      if (subscription.isOk) {
        subscriptions.set(uploadId, subscription.value);
      }
    };

    const startAndPublishFile = async (uploadId: string): Promise<boolean> => {
      const startResult = await manager.start(uploadId);
      if (startResult.isErr) {
        notify();
        return false;
      }

      const publishResult = await manager.publish(uploadId);
      notify();
      return publishResult.isOk;
    };

    const command = async (uploadId: string, action: (id: string) => Promise<unknown>): Promise<void> => {
      await action(uploadId);
      notify();
    };

    return {
      register: (uploadId, source, path) => manager.register(uploadId, source, path),
      attach,
      run: startAndPublishFile,
      snapshot: uploadId => manager.snapshot(uploadId).unwrapOr(undefined),
      cancel: uploadId => command(uploadId, manager.cancel),
      retryUpload: uploadId => command(uploadId, manager.retryUpload),
      retryPublish: uploadId => command(uploadId, manager.retryPublish),
      discard: uploadId => command(uploadId, manager.discard),
      retryDiscard: uploadId => command(uploadId, manager.retryDiscard),
    };
  };

  const createDirectUploadStrategy = ({
    cellsRepository,
    createAbortController,
  }: DirectUploadDependencies): UploadStrategy => {
    const uploadDirectFile = async (uploadId: string, request: UploadRequest): Promise<boolean> => {
      const source = createSource(request.file);
      const abortController = createAbortController();
      abortControllersByUploadId.set(uploadId, abortController);
      setState(uploadId, {kind: 'uploading', identity: {uploadId}, source, progress: 0});

      try {
        const {uuid, versionId} = await cellsRepository.uploadNode({
          uuid: uploadId,
          file: request.file,
          path: request.path,
          progressCallback: progress => setState(uploadId, {kind: 'uploading', identity: {uploadId}, source, progress}),
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

    const retryUpload = async (uploadId: string): Promise<void> => {
      const request = requestsByUploadId.get(uploadId);
      const currentState = statesByUploadId.get(uploadId);
      if (!request || currentState?.kind !== 'uploadFailed') {
        return;
      }

      await uploadDirectFile(uploadId, request);
    };

    const cancelUpload = async (uploadId: string): Promise<void> => {
      abortControllersByUploadId.get(uploadId)?.abort();
    };

    return {
      register: (uploadId, source) => {
        setState(uploadId, {kind: 'queued', identity: {uploadId}, source});
        return Result.ok(undefined);
      },
      attach: () => undefined,
      run: uploadDirectFile,
      snapshot: uploadId => statesByUploadId.get(uploadId),
      cancel: cancelUpload,
      retryUpload,
      retryPublish: async () => undefined,
      discard: async () => undefined,
      retryDiscard: async () => undefined,
    };
  };

  // Draft mode is not wired into production yet; it stays here as the migration path for staged Cells uploads.
  const uploadStrategy =
    mode === 'draft'
      ? createDraftUploadStrategy(dependencies as DraftUploadDependencies)
      : createDirectUploadStrategy(dependencies as DirectUploadDependencies);

  const registerFile = (file: File, path: string, conversationQualifiedId: string): Result<string, unknown> => {
    const uploadId = createUploadId();
    const source = createSource(file);
    const request = {file, path, conversationQualifiedId};
    const registered = uploadStrategy.register(uploadId, source, path);

    if (registered.isErr) {
      return Result.err(registered.error);
    }

    ids.push(uploadId);
    conversationByUploadId.set(uploadId, conversationQualifiedId);
    requestsByUploadId.set(uploadId, request);
    uploadStrategy.attach(uploadId);
    return Result.ok(uploadId);
  };

  const runUpload = async (uploadId: string, request: UploadRequest): Promise<boolean> =>
    uploadStrategy.run(uploadId, request);

  const uploadFile = async (file: File, path: string, conversationQualifiedId: string): Promise<boolean> => {
    const registration = registerFile(file, path, conversationQualifiedId);
    if (registration.isErr) {
      return false;
    }

    const request = requestsByUploadId.get(registration.value);
    return request ? runUpload(registration.value, request) : false;
  };

  const upload = async (
    files: readonly File[],
    path: string,
    onRefresh: () => void,
    conversationQualifiedId: string,
  ): Promise<void> => {
    const results = await Promise.all(files.map(file => uploadFile(file, path, conversationQualifiedId)));
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
    retryUpload: uploadStrategy.retryUpload,
    retryPublish: uploadStrategy.retryPublish,
    discard: uploadStrategy.discard,
    retryDiscard: uploadStrategy.retryDiscard,
  } satisfies SharedDriveUploadController;
};
