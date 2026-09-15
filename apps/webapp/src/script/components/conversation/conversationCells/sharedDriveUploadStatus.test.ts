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

import type {UploadSource} from 'Repositories/cells/upload';

import {
  getRepresentativeSharedDriveUploadStatus,
  getSharedDriveUploadAggregateKind,
  toSharedDriveUploadStatus,
} from './sharedDriveUploadStatus';

const source: UploadSource = {blob: new Blob(['data']), name: 'report.pdf', contentType: 'application/pdf', size: 4};
const conversationQualifiedId = 'conversation@example.com';
const state = (kind: string) => ({
  kind,
  identity: {uploadId: 'upload-1'},
  source,
  ...(kind === 'uploading' ? {progress: 0} : {}),
});

describe('toSharedDriveUploadStatus', () => {
  it.each(['queued', 'uploading'])('maps %s to its distinct status and marks it cancellable', kind => {
    expect(toSharedDriveUploadStatus(state(kind) as never, conversationQualifiedId)).toEqual({
      uploadId: 'upload-1',
      conversationQualifiedId,
      fileName: 'report.pdf',
      fileSize: 4,
      kind,
      progress: 0,
      hasProgress: false,
      isTransferActive: kind === 'uploading',
      canCancel: true,
      canRetry: false,
    });
  });

  it.each(['draftReady', 'publishing'])('maps %s to uploading but marks it not cancellable', kind => {
    expect(toSharedDriveUploadStatus(state(kind) as never, conversationQualifiedId)).toEqual(
      expect.objectContaining({
        kind: 'uploading',
        progress: 0,
        hasProgress: false,
        isTransferActive: false,
        canCancel: false,
      }),
    );
  });

  it('preserves reported transfer progress', () => {
    expect(
      toSharedDriveUploadStatus({...state('uploading'), progress: 0.45} as never, conversationQualifiedId),
    ).toEqual(expect.objectContaining({progress: 0.45, hasProgress: true, isTransferActive: true}));
  });

  it('maps published to uploaded', () => {
    expect(toSharedDriveUploadStatus(state('published') as never, conversationQualifiedId)?.kind).toBe('uploaded');
    expect(toSharedDriveUploadStatus(state('published') as never, conversationQualifiedId)?.canRetry).toBe(false);
  });

  it('marks an upload failure as retryable', () => {
    expect(toSharedDriveUploadStatus(state('uploadFailed') as never, conversationQualifiedId)).toEqual(
      expect.objectContaining({kind: 'failed', canCancel: false, canRetry: true}),
    );
  });

  it('makes a publish failure retryable without allowing upload cancellation', () => {
    expect(toSharedDriveUploadStatus(state('publishFailed') as never, conversationQualifiedId)).toEqual(
      expect.objectContaining({kind: 'failed', canCancel: false, canRetry: true}),
    );
  });

  it('does not make a discard failure retryable', () => {
    expect(toSharedDriveUploadStatus(state('discardFailed') as never, conversationQualifiedId)).toEqual(
      expect.objectContaining({kind: 'failed', canCancel: false, canRetry: false}),
    );
  });

  it.each(['cancelled', 'discarding', 'discarded'])('does not expose %s', kind => {
    expect(toSharedDriveUploadStatus(state(kind) as never, conversationQualifiedId)).toBeNull();
  });

  it('selects a representative using aggregate precedence', () => {
    const statuses = (['queued', 'uploading', 'uploadFailed', 'published'] as const).flatMap((kind, index) => {
      const status = toSharedDriveUploadStatus(state(kind) as never, conversationQualifiedId);
      return status ? [{...status, uploadId: `upload-${index}`}] : [];
    });

    expect(getRepresentativeSharedDriveUploadStatus(statuses, 'failed')?.uploadId).toBe('upload-2');
    expect(getRepresentativeSharedDriveUploadStatus(statuses, 'uploading')?.uploadId).toBe('upload-1');
    expect(getRepresentativeSharedDriveUploadStatus(statuses, 'queued')?.uploadId).toBe('upload-0');
  });

  it('aggregates statuses using active, queued, failed, then uploaded precedence', () => {
    const statuses = ['queued', 'uploading', 'uploadFailed', 'published'].map(kind =>
      toSharedDriveUploadStatus(state(kind) as never, conversationQualifiedId),
    );
    const visibleStatuses = statuses.filter((status): status is NonNullable<typeof status> => status !== null);

    expect(getSharedDriveUploadAggregateKind(visibleStatuses)).toBe('uploading');
    expect(getSharedDriveUploadAggregateKind(visibleStatuses.filter(status => status.kind !== 'uploading'))).toBe(
      'queued',
    );
    expect(
      getSharedDriveUploadAggregateKind(
        visibleStatuses.filter(status => !['uploading', 'queued'].includes(status.kind)),
      ),
    ).toBe('failed');
    expect(getSharedDriveUploadAggregateKind(visibleStatuses.filter(status => status.kind === 'uploaded'))).toBe(
      'uploaded',
    );
    expect(getSharedDriveUploadAggregateKind([])).toBeNull();
  });
});
