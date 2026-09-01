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

import type {Task} from 'true-myth';

import type {DraftIdentity, UploadSource} from './identity';

export type CellsUploadGatewayOperation = 'upload' | 'publish' | 'discard';
export type CellsUploadGatewayError<TOperation extends CellsUploadGatewayOperation = CellsUploadGatewayOperation> = {
  readonly kind: 'gatewayError';
  readonly operation: TOperation;
  readonly cause: unknown;
};

export type UploadDraftRequest = {
  readonly uploadId: string;
  readonly attemptId: string;
  readonly identity: DraftIdentity;
  readonly source: UploadSource;
  readonly path: string;
  readonly signal: AbortSignal;
  readonly onProgress: (progress: number) => void;
};

export interface CellsUploadGateway {
  readonly uploadDraft: (request: UploadDraftRequest) => Task<void, CellsUploadGatewayError<'upload'>>;
  readonly publishDraft: (identity: DraftIdentity) => Task<void, CellsUploadGatewayError<'publish'>>;
  readonly discardDraft: (identity: DraftIdentity) => Task<void, CellsUploadGatewayError<'discard'>>;
}
