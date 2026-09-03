/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import {result as resultModule} from 'true-myth';

import type {UploadAction, UploadLifecycleError, UploadState} from './lifecycle';
import {normalizeProgress, transition} from './transition';

const source = {blob: new Blob(['content']), name: 'file.txt', contentType: 'text/plain', size: 7};
const queued: UploadState = {kind: 'queued', identity: {uploadId: 'upload-1'}, source};
const uploading: UploadState = {...queued, kind: 'uploading', progress: 0, hasProgress: false};
const draftReady: UploadState = {
  kind: 'draftReady',
  identity: {uploadId: 'upload-1', resourceUuid: 'resource-1', versionId: 'version-1'},
  source,
};
const publishing: UploadState = {...draftReady, kind: 'publishing'};
const publishFailed: UploadState = {
  ...publishing,
  kind: 'publishFailed',
  error: {kind: 'publishFailed', cause: 'offline'},
};
const discarding: UploadState = {...draftReady, kind: 'discarding'};
const discardFailed: UploadState = {
  ...discarding,
  kind: 'discardFailed',
  error: {kind: 'discardFailed', cause: 'offline'},
};

const expectSuccess = (state: UploadState, action: UploadAction): UploadState => {
  const result = transition(state, action);
  expect(result.isOk).toBe(true);
  return resultModule.isOk(result) ? result.value : state;
};

const expectFailure = (state: UploadState, action: UploadAction): UploadLifecycleError => {
  const result = transition(state, action);
  expect(resultModule.isErr(result)).toBe(true);
  return resultModule.isErr(result)
    ? result.error
    : ({kind: 'invalidTransition', from: state.kind, action: action.type} as UploadLifecycleError);
};

describe('normalizeProgress', () => {
  it.each([
    {progress: -0.1, expected: 0},
    {progress: 0, expected: 0},
    {progress: 0.25, expected: 0.25},
    {progress: 1, expected: 1},
    {progress: 1.5, expected: 1},
    {progress: Number.NaN, expected: 0},
  ])('normalizes $progress to the inclusive 0..1 range', ({progress, expected}) => {
    expect(normalizeProgress(progress)).toBe(expected);
  });
});

describe('transition', () => {
  it.each([
    {state: queued, action: {type: 'startUpload'} as const, expected: 'uploading'},
    {
      state: uploading,
      action: {type: 'uploadSucceeded', resourceUuid: 'resource-1', versionId: 'version-1'} as const,
      expected: 'draftReady',
    },
    {
      state: uploading,
      action: {type: 'uploadFailed', error: {kind: 'uploadFailed', cause: 'offline'}} as const,
      expected: 'uploadFailed',
    },
    {state: draftReady, action: {type: 'publish'} as const, expected: 'publishing'},
    {state: publishing, action: {type: 'publishSucceeded'} as const, expected: 'published'},
    {
      state: publishing,
      action: {type: 'publishFailed', error: {kind: 'publishFailed', cause: 'offline'}} as const,
      expected: 'publishFailed',
    },
    {state: draftReady, action: {type: 'discard'} as const, expected: 'discarding'},
    {state: discarding, action: {type: 'discardSucceeded'} as const, expected: 'discarded'},
    {
      state: discarding,
      action: {type: 'discardFailed', error: {kind: 'discardFailed', cause: 'offline'}} as const,
      expected: 'discardFailed',
    },
  ])('allows $state.kind + $action.type -> $expected', ({state, action, expected}) => {
    expect(expectSuccess(state, action).kind).toBe(expected);
  });

  it('starts without determinate progress until the gateway reports it', () => {
    expect(expectSuccess(queued, {type: 'startUpload'})).toMatchObject({
      kind: 'uploading',
      progress: 0,
      hasProgress: false,
    });
  });

  it('normalizes and marks progress while uploading and ignores it outside active upload', () => {
    expect(expectSuccess(uploading, {type: 'progress', progress: 0.5})).toMatchObject({
      kind: 'uploading',
      progress: 0.5,
      hasProgress: true,
    });
    const result = transition(draftReady, {type: 'progress', progress: 0.8});
    expect(resultModule.isOk(result)).toBe(true);
    expect(resultModule.isOk(result) && result.value).toBe(draftReady);
  });

  it.each([
    {reported: -0.5, expected: 0},
    {reported: 1.5, expected: 1},
    {reported: Number.NaN, expected: 0},
  ])('clamps invalid progress $reported to $expected', ({reported, expected}) => {
    expect(expectSuccess(uploading, {type: 'progress', progress: reported})).toMatchObject({
      progress: expected,
      hasProgress: true,
    });
  });

  it('does not move progress backwards within an attempt', () => {
    const intermediate = expectSuccess(uploading, {type: 'progress', progress: 0.75});

    expect(expectSuccess(intermediate, {type: 'progress', progress: 0.25})).toMatchObject({
      progress: 0.75,
      hasProgress: true,
    });
  });

  it('preserves upload and draft identities across transitions', () => {
    const ready = expectSuccess(uploading, {
      type: 'uploadSucceeded',
      resourceUuid: 'resource-2',
      versionId: 'version-2',
    });
    expect(ready).toMatchObject({identity: {uploadId: 'upload-1', resourceUuid: 'resource-2', versionId: 'version-2'}});
  });

  it('removes active progress when upload fails', () => {
    expect(expectSuccess(uploading, {type: 'uploadFailed', error: {kind: 'uploadFailed', cause: 'offline'}})).toEqual({
      kind: 'uploadFailed',
      identity: queued.identity,
      source,
      error: {kind: 'uploadFailed', cause: 'offline'},
    });
  });

  it.each([
    {state: queued, action: {type: 'publish'} as const},
    {state: uploading, action: {type: 'publish'} as const},
    {state: publishing, action: {type: 'publish'} as const},
    {state: publishing, action: {type: 'discard'} as const},
    {state: publishFailed, action: {type: 'publish'} as const},
    {state: discardFailed, action: {type: 'discard'} as const},
    {state: draftReady, action: {type: 'cancel'} as const},
    {state: publishFailed, action: {type: 'cancel'} as const},
    {state: discardFailed, action: {type: 'cancel'} as const},
    {state: {...draftReady, kind: 'published'} as UploadState, action: {type: 'publish'} as const},
    {state: {...draftReady, kind: 'discarded'} as UploadState, action: {type: 'discard'} as const},
  ])('returns a typed error for invalid $state.kind + $action.type', ({state, action}) => {
    expect(expectFailure(state, action)).toMatchObject({
      kind: 'invalidTransition',
      from: state.kind,
      action: action.type,
    });
  });

  it('supports recovery from upload, publish, and discard failures without stale fields', () => {
    expect(
      expectSuccess(expectSuccess(uploading, {type: 'uploadFailed', error: {kind: 'uploadFailed', cause: 'offline'}}), {
        type: 'retryUpload',
      }),
    ).toEqual({kind: 'queued', identity: queued.identity, source});
    expect(expectSuccess(publishFailed, {type: 'retryPublish'})).toEqual({
      kind: 'draftReady',
      identity: draftReady.identity,
      source,
    });
    expect(expectSuccess(discardFailed, {type: 'retryDiscard'})).toEqual({
      kind: 'draftReady',
      identity: draftReady.identity,
      source,
    });
  });

  it.each([
    {state: queued, action: {type: 'cancel'} as const},
    {state: uploading, action: {type: 'cancel'} as const},
  ])('allows cancellation from $state.kind without stale fields', ({state, action}) => {
    expect(expectSuccess(state, action)).toEqual({kind: 'cancelled', identity: state.identity, source});
  });

  it('makes repeated cancellation idempotent', () => {
    const cancelled = expectSuccess(queued, {type: 'cancel'});
    const result = transition(cancelled, {type: 'cancel'});
    expect(resultModule.isOk(result)).toBe(true);
    expect(resultModule.isOk(result) && result.value).toBe(cancelled);
  });

  it('rejects repeated publish and discard after terminal outcomes', () => {
    const published = {...draftReady, kind: 'published'} as UploadState;
    const discarded = {...draftReady, kind: 'discarded'} as UploadState;
    expect(expectFailure(published, {type: 'publish'}).kind).toBe('invalidTransition');
    expect(expectFailure(discarded, {type: 'discard'}).kind).toBe('invalidTransition');
  });

  it('returns a Result instead of throwing for invalid actions', () => {
    const result = transition(publishedState(), {type: 'startUpload'});
    expect(result.isErr).toBe(true);
  });
});

const publishedState = (): UploadState => ({...draftReady, kind: 'published'}) as UploadState;
