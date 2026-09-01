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

import type {UploadSource, UploadState} from 'Repositories/cells/upload';
import type {CellsUploadManager} from 'Repositories/cells/upload/manager';
import type {UploadSnapshotListener} from 'Repositories/cells/upload/process';

export type SharedDriveUploadController = {
  readonly upload: (files: readonly File[], path: string, onRefresh: () => void) => Promise<void>;
  readonly snapshots: () => readonly UploadState[];
  readonly subscribe: (listener: () => void) => () => void;
  readonly cancel: (uploadId: string) => Promise<void>;
  readonly retryUpload: (uploadId: string) => Promise<void>;
  readonly retryPublish: (uploadId: string) => Promise<void>;
  readonly discard: (uploadId: string) => Promise<void>;
  readonly retryDiscard: (uploadId: string) => Promise<void>;
};

type Dependencies = {
  readonly manager: CellsUploadManager;
  readonly createUploadId: () => string;
  readonly createSource: (file: File) => UploadSource;
};

export const createSharedDriveUploadController = ({manager, createUploadId, createSource}: Dependencies) => {
  const ids: string[] = [];
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  const subscriptions = new Map<string, () => void>();

  const attach = (uploadId: string): void => {
    const listener: UploadSnapshotListener = () => notify();
    const result = manager.subscribe(uploadId, listener);
    if (result.isOk) {
      subscriptions.set(uploadId, result.value);
    }
  };

  const run = async (uploadId: string, command: (id: string) => Promise<Result<void, unknown>>): Promise<void> => {
    await command(uploadId);
    notify();
  };

  const upload = async (files: readonly File[], path: string, onRefresh: () => void): Promise<void> => {
    const operations = files.map(file => {
      const uploadId = createUploadId();
      ids.push(uploadId);
      const registered = manager.register(uploadId, createSource(file), path);
      if (registered.isErr) {
        return Promise.resolve(Result.err(registered.error));
      }
      attach(uploadId);
      return manager.start(uploadId).then(async result => {
        if (result.isErr) {
          return result;
        }
        return manager.publish(uploadId);
      });
    });
    const results = await Promise.all(operations);
    if (results.some(result => result.isOk)) {
      onRefresh();
    }
    notify();
  };

  const snapshots = (): readonly UploadState[] =>
    ids.flatMap(id => {
      const snapshot = manager.snapshot(id);
      return snapshot.isOk ? [snapshot.value] : [];
    });

  return {
    upload,
    snapshots,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    cancel: (id: string) => run(id, manager.cancel),
    retryUpload: (id: string) => run(id, manager.retryUpload),
    retryPublish: (id: string) => run(id, manager.retryPublish),
    discard: (id: string) => run(id, manager.discard),
    retryDiscard: (id: string) => run(id, manager.retryDiscard),
  } satisfies SharedDriveUploadController;
};
