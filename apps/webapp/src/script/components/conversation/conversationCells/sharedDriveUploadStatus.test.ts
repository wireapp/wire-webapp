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
  getSharedDriveUploadDisplayStatuses,
  toSharedDriveUploadStatus,
} from './sharedDriveUploadStatus';

const source: UploadSource = {blob: new Blob(['data']), name: 'report.pdf', contentType: 'application/pdf', size: 4};
const conversationQualifiedId = 'conversation@example.com';
const state = (kind: string) => {
  return {
    kind,
    identity: {uploadId: 'upload-1'},
    source,
    ...(kind === 'uploading' ? {progress: 0} : {}),
  };
};

const statusFor = (uploadState: unknown) => {
  const status = toSharedDriveUploadStatus(uploadState as never, conversationQualifiedId);
  if (!status) {
    throw new Error('Expected upload status');
  }
  return status;
};

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
      isFolder: false,
      cancellableUploadIds: ['upload-1'],
      retryableUploads: [],
    });
  });

  it.each(['draftReady', 'publishing'])('maps %s to uploading but marks it not cancellable', kind => {
    expect(toSharedDriveUploadStatus(state(kind) as never, conversationQualifiedId)).toEqual(
      expect.objectContaining({
        kind: 'uploading',
        progress: 0,
        hasProgress: false,
        isTransferActive: false,
        cancellableUploadIds: [],
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
    expect(toSharedDriveUploadStatus(state('published') as never, conversationQualifiedId)?.retryableUploads).toEqual(
      [],
    );
  });

  it('marks an upload failure as retryable', () => {
    expect(toSharedDriveUploadStatus(state('uploadFailed') as never, conversationQualifiedId)).toEqual(
      expect.objectContaining({
        kind: 'failed',
        cancellableUploadIds: [],
        retryableUploads: [{uploadId: 'upload-1', action: 'upload'}],
      }),
    );
  });

  it('makes a publish failure retryable without allowing upload cancellation', () => {
    expect(toSharedDriveUploadStatus(state('publishFailed') as never, conversationQualifiedId)).toEqual(
      expect.objectContaining({
        kind: 'failed',
        cancellableUploadIds: [],
        retryableUploads: [{uploadId: 'upload-1', action: 'publish'}],
      }),
    );
  });

  it('does not make a discard failure retryable', () => {
    expect(toSharedDriveUploadStatus(state('discardFailed') as never, conversationQualifiedId)).toEqual(
      expect.objectContaining({kind: 'failed', cancellableUploadIds: [], retryableUploads: []}),
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
    const statuses = ['queued', 'uploading', 'uploadFailed', 'published'].map(kind => {
      return toSharedDriveUploadStatus(state(kind) as never, conversationQualifiedId);
    });
    const visibleStatuses = statuses.filter((status): status is NonNullable<typeof status> => {
      return status !== null;
    });

    expect(getSharedDriveUploadAggregateKind(visibleStatuses)).toBe('uploading');
    expect(
      getSharedDriveUploadAggregateKind(
        visibleStatuses.filter(status => {
          return status.kind !== 'uploading';
        }),
      ),
    ).toBe('queued');
    expect(
      getSharedDriveUploadAggregateKind(
        visibleStatuses.filter(status => {
          return !['uploading', 'queued'].includes(status.kind);
        }),
      ),
    ).toBe('failed');
    expect(
      getSharedDriveUploadAggregateKind(
        visibleStatuses.filter(status => {
          return status.kind === 'uploaded';
        }),
      ),
    ).toBe('uploaded');
    expect(getSharedDriveUploadAggregateKind([])).toBeNull();
  });
});

describe('getSharedDriveUploadDisplayStatuses', () => {
  it('collapses files from a top-level folder while keeping individual files separate', () => {
    const statuses = [
      {
        ...statusFor({
          ...state('published'),
          identity: {uploadId: 'upload-1'},
          source: {...source, relativePath: 'Reports/one.txt'},
        }),
      },
      {
        ...statusFor({
          ...state('uploadFailed'),
          identity: {uploadId: 'upload-2'},
          source: {...source, relativePath: 'Reports/Archive/two.txt'},
        }),
      },
      statusFor({...state('queued'), identity: {uploadId: 'upload-3'}}),
    ];

    const displayStatuses = getSharedDriveUploadDisplayStatuses(statuses);
    expect(displayStatuses).toEqual([
      expect.objectContaining({
        uploadId: 'folder:upload-1',
        fileName: 'Reports',
        isFolder: true,
        fileCount: 2,
        failedFileCount: 1,
        kind: 'failed',
        cancellableUploadIds: [],
        retryableUploads: [{uploadId: 'upload-2', action: 'upload'}],
      }),
      expect.objectContaining({uploadId: 'upload-3'}),
    ]);
    expect(displayStatuses[1]).toEqual(expect.objectContaining({isFolder: false}));
  });

  it('uses byte-weighted progress for a folder', () => {
    const first = {
      ...statusFor({
        ...state('uploading'),
        source: {...source, size: 1, relativePath: 'Reports/one.txt'},
        progress: 0.5,
      }),
      uploadId: 'upload-1',
    };
    const second = {
      ...statusFor({...state('published'), source: {...source, size: 3, relativePath: 'Reports/two.txt'}}),
      uploadId: 'upload-2',
    };

    expect(getSharedDriveUploadDisplayStatuses([first, second])[0]).toEqual(expect.objectContaining({progress: 0.875}));
  });

  it('exposes only actionable children on a folder row', () => {
    const statuses = (['published', 'uploading', 'queued', 'uploadFailed', 'publishFailed'] as const).map(
      (kind, index) => {
        return statusFor({
          ...state(kind),
          identity: {uploadId: `upload-${index}`},
          source: {...source, relativePath: `Reports/file-${index}.txt`},
        });
      },
    );

    expect(getSharedDriveUploadDisplayStatuses(statuses)[0]).toEqual(
      expect.objectContaining({
        cancellableUploadIds: ['upload-1', 'upload-2'],
        retryableUploads: [
          {uploadId: 'upload-3', action: 'upload'},
          {uploadId: 'upload-4', action: 'publish'},
        ],
      }),
    );
  });

  it('derives repeated folder row identities from their upload IDs', () => {
    const firstBatch = [
      {
        ...statusFor({...state('published'), source: {...source, relativePath: 'Marketing/one.txt'}}),
        uploadId: 'first-batch-upload',
      },
    ];
    const secondBatch = [
      {
        ...statusFor({...state('published'), source: {...source, relativePath: 'Marketing/one.txt'}}),
        uploadId: 'second-batch-upload',
      },
    ];

    expect(getSharedDriveUploadDisplayStatuses(firstBatch)[0].uploadId).toBe('folder:first-batch-upload');
    expect(getSharedDriveUploadDisplayStatuses(secondBatch)[0].uploadId).toBe('folder:second-batch-upload');
  });
});
