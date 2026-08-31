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

import type {DraftIdentity, UploadIdentity, UploadSource} from './identity';

export interface QueuedState {
  readonly kind: 'queued';
  readonly identity: UploadIdentity;
  readonly source: UploadSource;
}

export interface UploadingState {
  readonly kind: 'uploading';
  readonly identity: UploadIdentity;
  readonly source: UploadSource;
  readonly progress: number;
}

export interface DraftReadyState {
  readonly kind: 'draftReady';
  readonly identity: DraftIdentity;
  readonly source: UploadSource;
}

export interface UploadFailedState {
  readonly kind: 'uploadFailed';
  readonly identity: UploadIdentity;
  readonly source: UploadSource;
  readonly error: UploadLifecycleError;
}

export interface PublishingState {
  readonly kind: 'publishing';
  readonly identity: DraftIdentity;
  readonly source: UploadSource;
}

export interface PublishedState {
  readonly kind: 'published';
  readonly identity: DraftIdentity;
  readonly source: UploadSource;
}

export interface PublishFailedState {
  readonly kind: 'publishFailed';
  readonly identity: DraftIdentity;
  readonly source: UploadSource;
  readonly error: UploadLifecycleError;
}

export interface DiscardingState {
  readonly kind: 'discarding';
  readonly identity: DraftIdentity;
  readonly source: UploadSource;
}

export interface DiscardedState {
  readonly kind: 'discarded';
  readonly identity: DraftIdentity;
  readonly source: UploadSource;
}

export interface DiscardFailedState {
  readonly kind: 'discardFailed';
  readonly identity: DraftIdentity;
  readonly source: UploadSource;
  readonly error: UploadLifecycleError;
}

export interface CancelledState {
  readonly kind: 'cancelled';
  readonly identity: UploadIdentity;
  readonly source: UploadSource;
}

export type UploadState =
  | QueuedState
  | UploadingState
  | DraftReadyState
  | UploadFailedState
  | PublishingState
  | PublishedState
  | PublishFailedState
  | DiscardingState
  | DiscardedState
  | DiscardFailedState
  | CancelledState;

export type UploadActionType =
  | 'startUpload'
  | 'progress'
  | 'uploadSucceeded'
  | 'uploadFailed'
  | 'publish'
  | 'publishSucceeded'
  | 'publishFailed'
  | 'discard'
  | 'discardSucceeded'
  | 'discardFailed'
  | 'retryUpload'
  | 'retryPublish'
  | 'retryDiscard'
  | 'cancel';

export type UploadFailureError = {readonly kind: 'uploadFailed'; readonly cause: unknown};
export type PublishFailureError = {readonly kind: 'publishFailed'; readonly cause: unknown};
export type DiscardFailureError = {readonly kind: 'discardFailed'; readonly cause: unknown};

export type UploadLifecycleError =
  | {readonly kind: 'invalidTransition'; readonly from: UploadState['kind']; readonly action: UploadActionType}
  | UploadFailureError
  | PublishFailureError
  | DiscardFailureError;

export type UploadAction =
  | {readonly type: 'startUpload'}
  | {readonly type: 'progress'; readonly progress: number}
  | {readonly type: 'uploadSucceeded'; readonly resourceUuid: string; readonly versionId: string}
  | {readonly type: 'uploadFailed'; readonly error: UploadFailureError}
  | {readonly type: 'publish'}
  | {readonly type: 'publishSucceeded'}
  | {readonly type: 'publishFailed'; readonly error: PublishFailureError}
  | {readonly type: 'discard'}
  | {readonly type: 'discardSucceeded'}
  | {readonly type: 'discardFailed'; readonly error: DiscardFailureError}
  | {readonly type: 'retryUpload'}
  | {readonly type: 'retryPublish'}
  | {readonly type: 'retryDiscard'}
  | {readonly type: 'cancel'};
