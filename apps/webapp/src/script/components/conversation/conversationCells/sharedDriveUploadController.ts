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
  readonly updateRefresh: (conversationQualifiedId: string, onRefresh: () => void) => void;
  readonly snapshots: (conversationQualifiedId: string) => readonly UploadState[];
  readonly subscribe: (listener: () => void) => () => void;
  readonly cancel: (uploadId: string) => Promise<void>;
  readonly retryUpload: (uploadId: string) => Promise<void>;
  readonly retryPublish: (uploadId: string) => Promise<void>;
  readonly discard: (uploadId: string) => Promise<void>;
  readonly retryDiscard: (uploadId: string) => Promise<void>;
  readonly dismiss?: (conversationQualifiedId: string, uploadId: string) => void;
  readonly isDismissed?: (conversationQualifiedId: string, uploadId: string) => boolean;
};

export type SharedDriveUploadRequest = {
  readonly file: File;
  readonly path: string;
};

const addUploadMetadata = (source: UploadSource, file: File): UploadSource => ({
  ...source,
  ...(file.webkitRelativePath ? {relativePath: file.webkitRelativePath} : {}),
});

type SharedDriveUploadSnapshotListener = () => void;

type UploadWork = {
  readonly uploadId: string;
  readonly execute: () => Promise<boolean>;
  readonly promise: Promise<boolean>;
  readonly resolve: (succeeded: boolean) => void;
  state: 'queued' | 'active' | 'settled';
};

const MAX_ACTIVE_UPLOADS = 3;

const isTerminalUploadState = (state: UploadState | undefined): boolean => {
  if (!state) {
    return false;
  }

  return !['queued', 'uploading', 'draftReady', 'publishing', 'discarding'].includes(state.kind);
};

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

const isTerminalBatch = (
  currentBatchUploadIds: Set<string> | undefined,
  uploadStrategy: SharedDriveUploadStrategy,
): boolean =>
  currentBatchUploadIds !== undefined &&
  currentBatchUploadIds.size > 0 &&
  [...currentBatchUploadIds].every(uploadId => isTerminalUploadState(uploadStrategy.snapshot(uploadId)));

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
    const source = addUploadMetadata(createSource(request.file), request.file);
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
      const state = statesByUploadId.get(uploadId);
      if (state?.kind === 'queued') {
        setState(uploadId, {kind: 'cancelled', identity: state.identity, source: state.source});
      }
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
  const refreshByConversationId = new Map<string, () => void>();
  const listeners = new Set<() => void>();
  const workByUploadId = new Map<string, UploadWork>();
  const currentBatchUploadIdsByConversation = new Map<string, Set<string>>();
  const dismissedUploadIdsByConversation = new Map<string, Set<string>>();
  const queuedWork: UploadWork[] = [];
  let activeWorkCount = 0;
  const notify = () => listeners.forEach(listener => listener());

  const createDeferredWork = (uploadId: string, execute: () => Promise<boolean>): UploadWork => {
    let resolvePromise: ((succeeded: boolean) => void) | undefined;
    const promise = new Promise<boolean>(resolve => {
      resolvePromise = resolve;
    });
    if (!resolvePromise) {
      throw new Error('Upload work resolver was not created');
    }

    return {uploadId, execute, promise, resolve: resolvePromise, state: 'queued'};
  };

  const settleWork = (work: UploadWork, succeeded: boolean): void => {
    if (work.state === 'settled') {
      return;
    }

    const wasActive = work.state === 'active';
    work.state = 'settled';
    if (wasActive) {
      activeWorkCount -= 1;
    }
    work.resolve(succeeded);
    if (workByUploadId.get(work.uploadId) === work) {
      workByUploadId.delete(work.uploadId);
    }
    pumpQueue();
  };

  const startWork = (work: UploadWork): void => {
    work.state = 'active';
    activeWorkCount += 1;
    let execution: Promise<boolean>;
    try {
      execution = work.execute();
    } catch {
      settleWork(work, false);
      return;
    }
    void execution.then(
      succeeded => settleWork(work, succeeded),
      () => settleWork(work, false),
    );
  };

  function pumpQueue(): void {
    while (activeWorkCount < MAX_ACTIVE_UPLOADS && queuedWork.length > 0) {
      const work = queuedWork.shift();
      if (!work || work.state !== 'queued') {
        continue;
      }
      startWork(work);
    }
  }

  const registerFile = (
    file: File,
    path: string,
    conversationQualifiedId: string,
    onRefresh: () => void,
  ): Result<string, unknown> => {
    const uploadId = createUploadId();
    const source = addUploadMetadata(createSource(file), file);
    const request = {file, path};
    const registered = uploadStrategy.register(uploadId, source, path);

    if (registered.isErr) {
      return Result.err(registered.error);
    }

    ids.push(uploadId);
    conversationByUploadId.set(uploadId, conversationQualifiedId);
    requestsByUploadId.set(uploadId, request);
    if (!refreshByConversationId.has(conversationQualifiedId)) {
      refreshByConversationId.set(conversationQualifiedId, onRefresh);
    }
    uploadStrategy.attach(uploadId, notify);
    return Result.ok(uploadId);
  };

  const updateRefresh = (conversationQualifiedId: string, onRefresh: () => void): void => {
    refreshByConversationId.set(conversationQualifiedId, onRefresh);
  };

  const enqueueWork = (work: UploadWork): void => {
    workByUploadId.set(work.uploadId, work);
    queuedWork.push(work);
  };

  const upload = async (
    files: readonly File[],
    path: string,
    onRefresh: () => void,
    conversationQualifiedId: string,
  ): Promise<void> => {
    const works: UploadWork[] = [];
    const currentBatchUploadIds = currentBatchUploadIdsByConversation.get(conversationQualifiedId);
    let nextBatchUploadIds = isTerminalBatch(currentBatchUploadIds, uploadStrategy) ? undefined : currentBatchUploadIds;

    if (!nextBatchUploadIds) {
      dismissedUploadIdsByConversation.delete(conversationQualifiedId);
    }

    for (const file of files) {
      const registration = registerFile(file, path, conversationQualifiedId, onRefresh);
      if (registration.isErr) {
        continue;
      }

      const uploadId = registration.value;
      if (!nextBatchUploadIds) {
        nextBatchUploadIds = new Set<string>();
        currentBatchUploadIdsByConversation.set(conversationQualifiedId, nextBatchUploadIds);
      }
      nextBatchUploadIds.add(uploadId);
      const request = requestsByUploadId.get(uploadId);
      if (!request) {
        continue;
      }

      const work = createDeferredWork(uploadId, () => uploadStrategy.run(uploadId, request));
      enqueueWork(work);
      works.push(work);
    }

    // Registration must be observable before any worker changes queued to uploading.
    notify();
    pumpQueue();

    const results = await Promise.all(works.map(work => work.promise));
    if (results.some(Boolean)) {
      refreshByConversationId.get(conversationQualifiedId)?.();
    }
    notify();
  };

  const cancel = async (id: string): Promise<void> => {
    const work = workByUploadId.get(id);
    if (work?.state === 'queued') {
      settleWork(work, false);
      notify();
    }

    try {
      await uploadStrategy.cancel(id);
    } finally {
      pumpQueue();
      notify();
    }
  };

  const retryUpload = async (id: string): Promise<void> => {
    const currentWork = workByUploadId.get(id);
    if (currentWork) {
      await currentWork.promise;
      return;
    }

    if (!requestsByUploadId.has(id)) {
      const succeeded = await uploadStrategy.retryUpload(id);
      if (succeeded) {
        refreshByConversationId.get(conversationByUploadId.get(id) ?? '')?.();
      }
      notify();
      return;
    }

    const work = createDeferredWork(id, () => uploadStrategy.retryUpload(id));
    enqueueWork(work);
    notify();
    pumpQueue();
    const succeeded = await work.promise;
    if (succeeded) {
      refreshByConversationId.get(conversationByUploadId.get(id) ?? '')?.();
    }
    notify();
  };

  const snapshots = (conversationQualifiedId: string): readonly UploadState[] =>
    [...(currentBatchUploadIdsByConversation.get(conversationQualifiedId) ?? [])].flatMap(uploadId => {
      const snapshot = uploadStrategy.snapshot(uploadId);
      return snapshot ? [snapshot] : [];
    });

  return {
    upload,
    updateRefresh,
    snapshots,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    cancel,
    retryUpload,
    retryPublish: uploadStrategy.retryPublish,
    discard: uploadStrategy.discard,
    retryDiscard: uploadStrategy.retryDiscard,
    dismiss: (conversationQualifiedId: string, uploadId: string): void => {
      const dismissedUploadIds = dismissedUploadIdsByConversation.get(conversationQualifiedId) ?? new Set<string>();
      dismissedUploadIds.add(uploadId);
      dismissedUploadIdsByConversation.set(conversationQualifiedId, dismissedUploadIds);
    },
    isDismissed: (conversationQualifiedId: string, uploadId: string): boolean =>
      dismissedUploadIdsByConversation.get(conversationQualifiedId)?.has(uploadId) ?? false,
  } satisfies SharedDriveUploadController;
};
