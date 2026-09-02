/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 */

import type {UploadSource} from 'Repositories/cells/upload';

import {toSharedDriveUploadStatus} from './sharedDriveUploadStatus';

const source: UploadSource = {blob: new Blob(['data']), name: 'report.pdf', contentType: 'application/pdf', size: 4};
const conversationQualifiedId = 'conversation@example.com';
const state = (kind: string) => ({
  kind,
  identity: {uploadId: 'upload-1'},
  source,
});

describe('toSharedDriveUploadStatus', () => {
  it.each(['queued', 'uploading', 'draftReady', 'publishing'])('maps %s to uploading', kind => {
    expect(toSharedDriveUploadStatus(state(kind) as never, conversationQualifiedId)).toEqual({
      uploadId: 'upload-1',
      conversationQualifiedId,
      fileName: 'report.pdf',
      kind: 'uploading',
    });
  });

  it('maps published to uploaded', () => {
    expect(toSharedDriveUploadStatus(state('published') as never, conversationQualifiedId)?.kind).toBe('uploaded');
  });

  it.each(['uploadFailed', 'publishFailed', 'discardFailed'])('maps %s to failed', kind => {
    expect(toSharedDriveUploadStatus(state(kind) as never, conversationQualifiedId)?.kind).toBe('failed');
  });

  it.each(['cancelled', 'discarding', 'discarded'])('does not expose %s', kind => {
    expect(toSharedDriveUploadStatus(state(kind) as never, conversationQualifiedId)).toBeNull();
  });
});
