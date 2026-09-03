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

import type {UploadState} from 'Repositories/cells/upload';

export type SharedDriveUploadStatusKind = 'uploading' | 'uploaded' | 'failed';

export type SharedDriveUploadStatus = {
  readonly uploadId: string;
  readonly conversationQualifiedId: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly kind: SharedDriveUploadStatusKind;
  readonly progress: number;
  readonly hasProgress: boolean;
  readonly isTransferActive: boolean;
  readonly canCancel: boolean;
};

const getSharedDriveUploadStatusKind = (state: UploadState): SharedDriveUploadStatusKind | null => {
  switch (state.kind) {
    case 'published':
      return 'uploaded';
    case 'uploadFailed':
    case 'publishFailed':
    case 'discardFailed':
      return 'failed';
    case 'queued':
    case 'uploading':
    case 'draftReady':
    case 'publishing':
      return 'uploading';
    default:
      return null;
  }
};

export const toSharedDriveUploadStatus = (
  state: UploadState,
  conversationQualifiedId: string,
): SharedDriveUploadStatus | null => {
  const kind = getSharedDriveUploadStatusKind(state);

  if (!kind) {
    return null;
  }

  return {
    uploadId: state.identity.uploadId,
    conversationQualifiedId,
    fileName: state.source.name,
    fileSize: state.source.size,
    kind,
    progress: state.kind === 'uploading' ? state.progress : 0,
    hasProgress: state.kind === 'uploading' && state.hasProgress,
    isTransferActive: state.kind === 'uploading',
    canCancel: state.kind === 'queued' || state.kind === 'uploading',
  };
};
