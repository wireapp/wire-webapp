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
