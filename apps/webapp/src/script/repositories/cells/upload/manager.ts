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

import {Maybe, Result, maybe} from 'true-myth';

import type {UploadSource} from './identity';
import type {UploadState} from './lifecycle';
import {
  createCellsUploadProcess,
  type CellsUploadProcess,
  type CellsUploadProcessDependencies,
  type UploadProcessError,
  type UploadSnapshotListener,
} from './process';

export type CellsUploadManagerError =
  | UploadProcessError
  | {readonly kind: 'unknownUpload'; readonly uploadId: string}
  | {readonly kind: 'duplicateUpload'; readonly uploadId: string};

export type CellsUploadManager = {
  readonly register: (uploadId: string, source: UploadSource, path: string) => Result<void, CellsUploadManagerError>;
  readonly snapshot: (uploadId: string) => Result<UploadState, CellsUploadManagerError>;
  readonly subscribe: (
    uploadId: string,
    listener: UploadSnapshotListener,
  ) => Result<() => void, CellsUploadManagerError>;
  readonly start: (uploadId: string) => Promise<Result<void, CellsUploadManagerError>>;
  readonly cancel: (uploadId: string) => Promise<Result<void, CellsUploadManagerError>>;
  readonly retryUpload: (uploadId: string) => Promise<Result<void, CellsUploadManagerError>>;
  readonly publish: (uploadId: string) => Promise<Result<void, CellsUploadManagerError>>;
  readonly retryPublish: (uploadId: string) => Promise<Result<void, CellsUploadManagerError>>;
  readonly discard: (uploadId: string) => Promise<Result<void, CellsUploadManagerError>>;
  readonly retryDiscard: (uploadId: string) => Promise<Result<void, CellsUploadManagerError>>;
  readonly release: (uploadId: string) => Result<void, CellsUploadManagerError>;
};

export const createCellsUploadManager = (dependencies: CellsUploadProcessDependencies): CellsUploadManager => {
  const processes = new Map<string, CellsUploadProcess>();
  const unknown = <T>(uploadId: string): Result<T, CellsUploadManagerError> =>
    Result.err({kind: 'unknownUpload', uploadId});
  const processFor = (uploadId: string): Result<CellsUploadProcess, CellsUploadManagerError> => {
    const process = Maybe.of(processes.get(uploadId));
    return maybe.isJust(process) ? Result.ok(process.value) : unknown(uploadId);
  };
  const command = (
    uploadId: string,
    name: 'start' | 'cancel' | 'retryUpload' | 'publish' | 'retryPublish' | 'discard' | 'retryDiscard',
  ) => {
    const process = processFor(uploadId);
    return process.isErr ? Promise.resolve(Result.err(process.error)) : process.value[name]();
  };

  const register = (uploadId: string, source: UploadSource, path: string): Result<void, CellsUploadManagerError> => {
    if (processes.has(uploadId)) {
      return Result.err({kind: 'duplicateUpload', uploadId});
    }
    processes.set(uploadId, createCellsUploadProcess(uploadId, source, path, dependencies));
    return Result.ok(undefined);
  };

  const release = (uploadId: string): Result<void, CellsUploadManagerError> => {
    const process = processFor(uploadId);
    if (process.isErr) {
      return Result.err(process.error);
    }
    const result = process.value.release();
    if (result.isOk) {
      processes.delete(uploadId);
    }
    return result;
  };

  return {
    register,
    snapshot: uploadId => {
      const process = processFor(uploadId);
      return process.isErr ? Result.err(process.error) : process.value.snapshot();
    },
    subscribe: (uploadId, listener) => {
      const process = processFor(uploadId);
      return process.isErr ? Result.err(process.error) : process.value.subscribe(listener);
    },
    start: uploadId => command(uploadId, 'start'),
    cancel: uploadId => command(uploadId, 'cancel'),
    retryUpload: uploadId => command(uploadId, 'retryUpload'),
    publish: uploadId => command(uploadId, 'publish'),
    retryPublish: uploadId => command(uploadId, 'retryPublish'),
    discard: uploadId => command(uploadId, 'discard'),
    retryDiscard: uploadId => command(uploadId, 'retryDiscard'),
    release,
  };
};
