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

import {isNan, isNull, isNonEmptyString, isUndefined} from '@sindresorhus/is';

import type {UploadState} from 'Repositories/cells/upload';

import type {SharedDriveUploadController} from './sharedDriveUploadController';

export type SharedDriveUploadStatusKind = 'queued' | 'uploading' | 'uploaded' | 'failed';

export type DismissedUpload = {
  readonly conversationQualifiedId: string;
  readonly uploadId: string;
};

type SharedDriveUploadStatusBase = {
  readonly uploadId: string;
  readonly conversationQualifiedId: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly kind: SharedDriveUploadStatusKind;
  readonly progress: number;
  readonly hasProgress: boolean;
  readonly isTransferActive: boolean;
};

export type SharedDriveRetryableUpload = {
  readonly uploadId: string;
  readonly action: 'upload' | 'publish';
};

export type SharedDriveUploadFileStatus = SharedDriveUploadStatusBase & {
  readonly isFolder: false;
  readonly relativePath?: string;
  readonly cancellableUploadIds: readonly string[];
  readonly retryableUploads: readonly SharedDriveRetryableUpload[];
};

export type SharedDriveUploadFolderStatus = SharedDriveUploadStatusBase & {
  readonly isFolder: true;
  readonly fileCount: number;
  readonly uploadedFileCount: number;
  readonly failedFileCount: number;
  readonly cancellableUploadIds: readonly string[];
  readonly retryableUploads: readonly SharedDriveRetryableUpload[];
};

export type SharedDriveUploadStatus = SharedDriveUploadFileStatus | SharedDriveUploadFolderStatus;

const getSharedDriveUploadStatusKind = (state: UploadState): SharedDriveUploadStatusKind | null => {
  switch (state.kind) {
    case 'published':
      return 'uploaded';
    case 'uploadFailed':
    case 'publishFailed':
    case 'discardFailed':
      return 'failed';
    case 'queued':
      return 'queued';
    case 'uploading':
    case 'draftReady':
    case 'publishing':
      return 'uploading';
    default:
      return null;
  }
};

const getRetryableUploads = (state: UploadState): readonly SharedDriveRetryableUpload[] => {
  if (state.kind === 'uploadFailed') {
    return [{uploadId: state.identity.uploadId, action: 'upload'}];
  }
  if (state.kind === 'publishFailed') {
    return [{uploadId: state.identity.uploadId, action: 'publish'}];
  }
  return [];
};

export const toSharedDriveUploadStatus = (
  state: UploadState,
  conversationQualifiedId: string,
): SharedDriveUploadFileStatus | null => {
  const kind = getSharedDriveUploadStatusKind(state);

  if (isNull(kind)) {
    return null;
  }

  return {
    uploadId: state.identity.uploadId,
    conversationQualifiedId,
    fileName: state.source.name,
    fileSize: state.source.size,
    kind,
    progress: state.kind === 'uploading' ? state.progress : 0,
    hasProgress: state.kind === 'uploading' && state.progress > 0,
    isTransferActive: state.kind === 'uploading',
    isFolder: false,
    cancellableUploadIds: state.kind === 'queued' || state.kind === 'uploading' ? [state.identity.uploadId] : [],
    retryableUploads: getRetryableUploads(state),
    ...(isNonEmptyString(state.source.relativePath) ? {relativePath: state.source.relativePath} : {}),
  };
};

const getTopLevelFolder = (relativePath: string | undefined): string | null => {
  if (!isNonEmptyString(relativePath)) {
    return null;
  }

  const [folderName, fileName] = relativePath.split('/');
  return isNonEmptyString(folderName) && isNonEmptyString(fileName) ? folderName : null;
};

const getFolderStatus = (statuses: readonly SharedDriveUploadFileStatus[]): SharedDriveUploadStatusKind => {
  return getSharedDriveUploadAggregateKind(statuses) ?? 'queued';
};

export const getSharedDriveUploadDisplayStatuses = (
  statuses: readonly SharedDriveUploadFileStatus[],
): SharedDriveUploadStatus[] => {
  const grouped = new Map<string, SharedDriveUploadFileStatus[]>();
  const orderedGroups: {folderId: string; folderName: string; statuses: SharedDriveUploadFileStatus[]}[] = [];
  const individualStatuses: SharedDriveUploadStatus[] = [];
  const rowOrder: string[] = [];

  statuses.forEach(status => {
    const folderName = getTopLevelFolder(status.relativePath);
    if (!isNonEmptyString(folderName)) {
      individualStatuses.push(status);
      rowOrder.push(status.uploadId);
      return;
    }

    const group = grouped.get(folderName);
    if (!isUndefined(group)) {
      group.push(status);
    } else {
      const folderStatuses = [status];
      const folderId = `folder:${status.uploadId}`;
      grouped.set(folderName, folderStatuses);
      orderedGroups.push({folderId, folderName, statuses: folderStatuses});
      rowOrder.push(folderId);
    }
  });

  orderedGroups.forEach(({folderId, statuses: folderStatuses, folderName}) => {
    const totalSize = folderStatuses.reduce((total, status) => total + status.fileSize, 0);
    const progress =
      totalSize !== 0 && !isNan(totalSize)
        ? folderStatuses.reduce((total, status) => {
            let fileProgress = 0;
            if (status.kind === 'uploaded') {
              fileProgress = 1;
            } else if (status.isTransferActive) {
              fileProgress = status.progress;
            }
            return total + status.fileSize * fileProgress;
          }, 0) / totalSize
        : 0;
    const failedFileCount = folderStatuses.filter(status => status.kind === 'failed').length;
    const uploadedFileCount = folderStatuses.filter(status => status.kind === 'uploaded').length;
    const displayStatus = {
      uploadId: folderId,
      conversationQualifiedId: folderStatuses[0].conversationQualifiedId,
      fileName: folderName,
      fileSize: totalSize,
      kind: getFolderStatus(folderStatuses),
      progress,
      hasProgress: folderStatuses.some(status => status.hasProgress || status.kind === 'uploaded'),
      isTransferActive: folderStatuses.some(status => status.isTransferActive),
      isFolder: true,
      fileCount: folderStatuses.length,
      uploadedFileCount,
      failedFileCount,
      cancellableUploadIds: folderStatuses.flatMap(status => status.cancellableUploadIds),
      retryableUploads: folderStatuses.flatMap(status => status.retryableUploads),
    } satisfies SharedDriveUploadStatus;
    individualStatuses.push(displayStatus);
  });

  const folderStatuses = individualStatuses.filter(status => status.isFolder);
  const fileStatuses = new Map(
    individualStatuses.filter(status => !status.isFolder).map(status => [status.uploadId, status]),
  );
  const folders = new Map(folderStatuses.map(status => [status.uploadId, status]));
  return rowOrder.flatMap(rowId => {
    const row = folders.get(rowId) ?? fileStatuses.get(rowId);
    return !isUndefined(row) ? [row] : [];
  });
};

export const getSharedDriveUploadStatuses = (
  controller: SharedDriveUploadController,
  conversationQualifiedId: string,
): SharedDriveUploadFileStatus[] =>
  controller.snapshots(conversationQualifiedId).flatMap(snapshot => {
    const status = toSharedDriveUploadStatus(snapshot, conversationQualifiedId);
    return !isNull(status) ? [status] : [];
  });

export const getSharedDriveUploadAggregateKind = (
  statuses: readonly SharedDriveUploadStatus[],
): SharedDriveUploadStatusKind | null => {
  if (statuses.some(status => status.kind === 'uploading')) {
    return 'uploading';
  }
  if (statuses.some(status => status.kind === 'queued')) {
    return 'queued';
  }
  if (statuses.some(status => status.kind === 'failed')) {
    return 'failed';
  }
  return statuses.length > 0 ? 'uploaded' : null;
};

export const getRepresentativeSharedDriveUploadStatus = (
  statuses: readonly SharedDriveUploadStatus[],
  aggregateKind: SharedDriveUploadStatusKind,
): SharedDriveUploadStatus | null =>
  statuses.find(status => status.kind === aggregateKind) ??
  statuses.find(status => status.kind === 'uploading') ??
  statuses.find(status => status.kind === 'queued') ??
  statuses[0] ??
  null;
