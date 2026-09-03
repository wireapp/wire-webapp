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

import type {UploadAction, UploadLifecycleError, UploadState} from './lifecycle';

export const normalizeProgress = (progress: number): number => {
  if (Number.isNaN(progress)) {
    return 0;
  }

  return Math.min(1, Math.max(0, progress));
};

const invalidTransition = (state: UploadState, action: UploadAction): Result<UploadState, UploadLifecycleError> =>
  Result.err({kind: 'invalidTransition', from: state.kind, action: action.type});

const transitionFromQueued = (state: Extract<UploadState, {kind: 'queued'}>, action: UploadAction) => {
  if (action.type === 'startUpload') {
    return Result.ok<UploadState, UploadLifecycleError>({
      kind: 'uploading',
      identity: state.identity,
      source: state.source,
      progress: 0,
      hasProgress: false,
    });
  }

  if (action.type === 'cancel') {
    return Result.ok<UploadState, UploadLifecycleError>({
      kind: 'cancelled',
      identity: state.identity,
      source: state.source,
    });
  }

  return invalidTransition(state, action);
};

const transitionFromUploading = (state: Extract<UploadState, {kind: 'uploading'}>, action: UploadAction) => {
  if (action.type === 'progress') {
    const progress = normalizeProgress(action.progress);
    return Result.ok<UploadState, UploadLifecycleError>({
      ...state,
      progress: Math.max(state.progress, progress),
      hasProgress: true,
    });
  }

  if (action.type === 'uploadSucceeded') {
    return Result.ok<UploadState, UploadLifecycleError>({
      kind: 'draftReady',
      identity: {...state.identity, resourceUuid: action.resourceUuid, versionId: action.versionId},
      source: state.source,
    });
  }

  if (action.type === 'uploadFailed') {
    return Result.ok<UploadState, UploadLifecycleError>({
      kind: 'uploadFailed',
      identity: state.identity,
      source: state.source,
      error: action.error,
    });
  }

  if (action.type === 'cancel') {
    return Result.ok<UploadState, UploadLifecycleError>({
      kind: 'cancelled',
      identity: state.identity,
      source: state.source,
    });
  }

  return invalidTransition(state, action);
};

const transitionFromDraftReady = (state: Extract<UploadState, {kind: 'draftReady'}>, action: UploadAction) => {
  if (action.type === 'publish') {
    return Result.ok<UploadState, UploadLifecycleError>({...state, kind: 'publishing'});
  }

  if (action.type === 'discard') {
    return Result.ok<UploadState, UploadLifecycleError>({...state, kind: 'discarding'});
  }

  return invalidTransition(state, action);
};

const transitionFromUploadFailed = (state: Extract<UploadState, {kind: 'uploadFailed'}>, action: UploadAction) => {
  if (action.type === 'retryUpload') {
    return Result.ok<UploadState, UploadLifecycleError>({
      kind: 'queued',
      identity: state.identity,
      source: state.source,
    });
  }

  return invalidTransition(state, action);
};

const transitionFromPublishing = (state: Extract<UploadState, {kind: 'publishing'}>, action: UploadAction) => {
  if (action.type === 'publishSucceeded') {
    return Result.ok<UploadState, UploadLifecycleError>({...state, kind: 'published'});
  }

  if (action.type === 'publishFailed') {
    return Result.ok<UploadState, UploadLifecycleError>({
      kind: 'publishFailed',
      identity: state.identity,
      source: state.source,
      error: action.error,
    });
  }

  return invalidTransition(state, action);
};

const transitionFromPublishFailed = (state: Extract<UploadState, {kind: 'publishFailed'}>, action: UploadAction) => {
  if (action.type === 'retryPublish') {
    return Result.ok<UploadState, UploadLifecycleError>({
      kind: 'draftReady',
      identity: state.identity,
      source: state.source,
    });
  }

  return invalidTransition(state, action);
};

const transitionFromDiscarding = (state: Extract<UploadState, {kind: 'discarding'}>, action: UploadAction) => {
  if (action.type === 'discardSucceeded') {
    return Result.ok<UploadState, UploadLifecycleError>({
      kind: 'discarded',
      identity: state.identity,
      source: state.source,
    });
  }

  if (action.type === 'discardFailed') {
    return Result.ok<UploadState, UploadLifecycleError>({
      kind: 'discardFailed',
      identity: state.identity,
      source: state.source,
      error: action.error,
    });
  }

  return invalidTransition(state, action);
};

const transitionFromDiscardFailed = (state: Extract<UploadState, {kind: 'discardFailed'}>, action: UploadAction) => {
  if (action.type === 'retryDiscard') {
    return Result.ok<UploadState, UploadLifecycleError>({
      kind: 'draftReady',
      identity: state.identity,
      source: state.source,
    });
  }

  return invalidTransition(state, action);
};

export const transition = (state: UploadState, action: UploadAction): Result<UploadState, UploadLifecycleError> => {
  if (action.type === 'progress' && state.kind !== 'uploading') {
    return Result.ok(state);
  }

  switch (state.kind) {
    case 'queued':
      return transitionFromQueued(state, action);
    case 'uploading':
      return transitionFromUploading(state, action);
    case 'draftReady':
      return transitionFromDraftReady(state, action);
    case 'uploadFailed':
      return transitionFromUploadFailed(state, action);
    case 'publishing':
      return transitionFromPublishing(state, action);
    case 'published':
    case 'discarded':
      return invalidTransition(state, action);
    case 'publishFailed':
      return transitionFromPublishFailed(state, action);
    case 'discarding':
      return transitionFromDiscarding(state, action);
    case 'discardFailed':
      return transitionFromDiscardFailed(state, action);
    case 'cancelled':
      return action.type === 'cancel' ? Result.ok(state) : invalidTransition(state, action);
  }
};
