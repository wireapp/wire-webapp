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

import {Task, task} from 'true-myth';

import type {CellsRepository} from './cellsRepository';
import type {CellsUploadGateway, CellsUploadGatewayError} from './upload/gateway';

type CellsRepositoryUploadGateway = Pick<CellsRepository, 'uploadNodeDraft' | 'promoteNodeDraft' | 'deleteNodeDraft'>;
type TaskExecutor<T> = () => PromiseLike<T>;

const execute = <T, TOperation extends CellsUploadGatewayError['operation']>(
  operation: TOperation,
  executor: TaskExecutor<T>,
): Task<T, CellsUploadGatewayError<TOperation>> =>
  task.tryOrElse(
    reason => ({kind: 'gatewayError', operation, cause: reason}),
    () => Promise.resolve().then(executor),
  );

/** Adapts the app-side Cells repository to the lifecycle manager contract. */
export const createCellsRepositoryGateway = (cellsRepository: CellsRepositoryUploadGateway): CellsUploadGateway => ({
  uploadDraft: request =>
    execute('upload', () =>
      cellsRepository
        .uploadNodeDraft({
          uuid: request.identity.resourceUuid,
          file:
            request.source.blob instanceof File
              ? request.source.blob
              : new File([request.source.blob], request.source.name, {type: request.source.contentType}),
          path: request.path,
          versionId: request.identity.versionId,
          abortController: request.abortController,
          progressCallback: request.onProgress,
        })
        .then(result => ({
          uploadId: request.identity.uploadId,
          resourceUuid: result.uuid,
          versionId: result.versionId,
        })),
    ),
  publishDraft: identity =>
    execute('publish', () =>
      cellsRepository
        .promoteNodeDraft({uuid: identity.resourceUuid, versionId: identity.versionId})
        .then(() => undefined),
    ),
  discardDraft: identity =>
    execute('discard', () =>
      cellsRepository
        .deleteNodeDraft({uuid: identity.resourceUuid, versionId: identity.versionId})
        .then(() => undefined),
    ),
});
