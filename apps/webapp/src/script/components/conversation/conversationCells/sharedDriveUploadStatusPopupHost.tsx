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

import {useCallback, useEffect, useState} from 'react';

import {Maybe, maybe} from 'true-myth';

import {useApplicationContext} from 'src/script/page/rootProvider';
import {formatBytes} from 'Util/util';

import type {SharedDriveUploadController} from './sharedDriveUploadController';
import {
  getRepresentativeSharedDriveUploadStatus,
  getSharedDriveUploadAggregateKind,
  getSharedDriveUploadDisplayStatuses,
  getSharedDriveUploadStatuses,
  type SharedDriveUploadStatus,
  type SharedDriveUploadStatusKind,
  type DismissedUpload,
} from './sharedDriveUploadStatus';
import {useSharedDriveUploadStatus} from './sharedDriveUploadStatusContext';
import {SharedDriveUploadStatusPopup} from './sharedDriveUploadStatusPopup';

interface SharedDriveUploadStatusPopupHostProps {
  readonly controller: SharedDriveUploadController;
  readonly conversationQualifiedId: string;
  readonly isEnabled: boolean;
  readonly isFileTabActive: boolean;
}

const PROGRESS_PERCENTAGE_MAX = 100;

const getRowStatusLabel = (
  row: SharedDriveUploadStatus,
  translate: ReturnType<typeof useApplicationContext>['translate'],
  statusLabelKey: Record<SharedDriveUploadStatusKind, string>,
): string => {
  if (row.isFolder) {
    if (row.kind === 'failed') {
      return translate('cells.uploadStatus.failedFiles', {failed: row.failedFileCount, total: row.fileCount});
    }
    if (row.kind === 'uploaded') {
      return translate('cells.uploadStatus.uploadedFiles', {count: row.fileCount});
    }
    if (row.kind === 'queued') {
      return translate('cells.uploadStatus.queuedFiles', {count: row.fileCount});
    }
    return translate('cells.uploadStatus.uploadingFiles', {
      count: row.fileCount,
      progress: Math.round(row.progress * PROGRESS_PERCENTAGE_MAX),
    });
  }

  if (row.kind === 'failed') {
    return translate(statusLabelKey.failed);
  }

  return translate(statusLabelKey[row.kind], {size: formatBytes(row.fileSize)});
};

export const SharedDriveUploadStatusPopupHost = ({
  controller,
  conversationQualifiedId,
  isEnabled,
  isFileTabActive,
}: SharedDriveUploadStatusPopupHostProps) => {
  const {translate} = useApplicationContext();
  const {
    dismissedUpload: contextDismissedUpload,
    dismissUpload: onDismissUpload,
    isProvided,
  } = useSharedDriveUploadStatus();
  const readStatuses = useCallback(
    () => getSharedDriveUploadStatuses(controller, conversationQualifiedId),
    [controller, conversationQualifiedId],
  );
  const [uploadSnapshot, setUploadSnapshot] = useState(() => ({conversationQualifiedId, uploads: readStatuses()}));
  const [isExpanded, setIsExpanded] = useState(false);
  const [cancellingUploadIds, setCancellingUploadIds] = useState<ReadonlySet<string>>(() => new Set());
  const [retryingUploadIds, setRetryingUploadIds] = useState<ReadonlySet<string>>(() => new Set());
  const [dismissedRowIds, setDismissedRowIds] = useState<ReadonlySet<string>>(() => new Set());
  const [localDismissedUpload, setLocalDismissedUpload] = useState<Maybe<DismissedUpload>>(Maybe.nothing());
  const dismissedUpload = isProvided ? contextDismissedUpload : localDismissedUpload;
  const dismissUpload = useCallback(
    (upload: DismissedUpload) => {
      setLocalDismissedUpload(Maybe.just(upload));
      onDismissUpload(upload);
    },
    [onDismissUpload],
  );
  const rawUploads =
    uploadSnapshot.conversationQualifiedId === conversationQualifiedId ? uploadSnapshot.uploads : readStatuses();
  const uploads = getSharedDriveUploadDisplayStatuses(rawUploads);
  const visibleUploads = uploads.filter(({uploadId}) => !dismissedRowIds.has(uploadId));
  const aggregateKind = getSharedDriveUploadAggregateKind(visibleUploads);
  const representativeUpload = aggregateKind
    ? getRepresentativeSharedDriveUploadStatus(visibleUploads, aggregateKind)
    : null;
  const canDismissUploadStatus = visibleUploads.length > 0 && visibleUploads.every(({kind}) => kind === 'uploaded');
  const isUploadDismissed =
    maybe.isJust(dismissedUpload) &&
    dismissedUpload.value.conversationQualifiedId === conversationQualifiedId &&
    representativeUpload?.uploadId === dismissedUpload.value.uploadId;

  const isCancelling = useCallback(
    (uploadId: string): boolean => {
      const row = visibleUploads.find(upload => upload.uploadId === uploadId);
      return (row?.childUploadIds ?? [uploadId]).some(childUploadId => cancellingUploadIds.has(childUploadId));
    },
    [cancellingUploadIds, visibleUploads],
  );
  const childUploadIds = useCallback(
    (uploadId: string): readonly string[] =>
      visibleUploads.find(upload => upload.uploadId === uploadId)?.childUploadIds ?? [uploadId],
    [visibleUploads],
  );
  const cancelUploadIds = useCallback(
    (uploadIds: readonly string[]): void => {
      const pendingIds = uploadIds
        .flatMap(uploadId => childUploadIds(uploadId))
        .filter(uploadId => !cancellingUploadIds.has(uploadId));
      if (pendingIds.length === 0) {
        return;
      }

      setCancellingUploadIds(current => new Set([...current, ...pendingIds]));
      const finishCancellation = (uploadId: string) =>
        setCancellingUploadIds(current => {
          const next = new Set(current);
          next.delete(uploadId);
          return next;
        });
      pendingIds.forEach(uploadId => {
        void Promise.resolve()
          .then(() => controller.cancel(uploadId))
          .then(
            () => finishCancellation(uploadId),
            () => finishCancellation(uploadId),
          );
      });
    },
    [cancellingUploadIds, childUploadIds, controller],
  );
  const cancelAllUploads = useCallback(
    (): void => cancelUploadIds(visibleUploads.filter(({canCancel}) => canCancel).map(({uploadId}) => uploadId)),
    [cancelUploadIds, visibleUploads],
  );
  const cancelUpload = useCallback((uploadId: string): void => cancelUploadIds([uploadId]), [cancelUploadIds]);

  const dismissRow = useCallback((uploadId: string): void => {
    setDismissedRowIds(current => new Set([...current, uploadId]));
  }, []);

  const retryUpload = useCallback(
    (uploadId: string): void => {
      const uploadIds = childUploadIds(uploadId);
      if (uploadIds.some(id => retryingUploadIds.has(id))) {
        return;
      }

      setRetryingUploadIds(current => new Set([...current, ...uploadIds]));
      const finishRetry = (id: string) =>
        setRetryingUploadIds(current => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      uploadIds.forEach(id => {
        const snapshot = controller.snapshots(conversationQualifiedId).find(state => state.identity.uploadId === id);
        const retry = snapshot?.kind === 'publishFailed' ? controller.retryPublish : controller.retryUpload;
        void retry(id).then(
          () => finishRetry(id),
          () => finishRetry(id),
        );
      });
    },
    [childUploadIds, controller, conversationQualifiedId, retryingUploadIds],
  );

  useEffect(() => {
    const updateStatus = () => setUploadSnapshot({conversationQualifiedId, uploads: readStatuses()});
    updateStatus();
    return controller.subscribe(updateStatus);
  }, [controller, conversationQualifiedId, readStatuses]);

  if (!isEnabled || !isFileTabActive || !representativeUpload || isUploadDismissed || !aggregateKind) {
    return null;
  }

  const titleKey = {
    queued: 'cells.uploadStatus.queued',
    uploading: 'cells.uploadStatus.uploading',
    uploaded: 'cells.uploadStatus.uploaded',
    failed: 'cells.uploadStatus.failed',
  } as const;
  const aggregateTitleKey = {
    queued: 'cells.uploadStatus.queuedItems',
    uploading: 'cells.uploadStatus.uploadingItems',
    uploaded: 'cells.uploadStatus.uploadedItems',
    failed: 'cells.uploadStatus.failedItems',
  } as const;
  const statusLabelKey = {
    queued: 'cells.uploadStatus.queuedSize',
    uploading: 'cells.uploadStatus.uploadingSize',
    uploaded: 'cells.uploadStatus.uploadedSize',
    failed: 'cells.uploadStatus.failedLabel',
  } as const;
  const displayName = representativeUpload.fileName;
  const statusLabels = new Map(
    visibleUploads.map(row => [row.uploadId, getRowStatusLabel(row, translate, statusLabelKey)]),
  );
  const statusLabel = statusLabels.get(representativeUpload.uploadId) ?? '';

  return (
    <SharedDriveUploadStatusPopup
      upload={representativeUpload}
      uploads={visibleUploads}
      aggregateKind={aggregateKind}
      title={translate(
        visibleUploads.length > 1 ? aggregateTitleKey[aggregateKind] : titleKey[aggregateKind],
        visibleUploads.length > 1 ? {count: visibleUploads.length} : {name: displayName},
      )}
      statusLabel={statusLabel}
      statusLabels={statusLabels}
      destination={translate('cells.uploadStatus.destination', {destination: translate('cells.sharedDrive.title')})}
      isExpanded={isExpanded}
      toggleLabel={translate(isExpanded ? 'cells.uploadStatus.collapse' : 'cells.uploadStatus.expand')}
      cancelLabel={translate('conversationAssetUploadCancel')}
      headerCancelLabel={translate(
        visibleUploads.length > 1 ? 'cells.uploadStatus.cancelAll' : 'conversationAssetUploadCancel',
      )}
      dismissLabel={translate('fileCardDefaultCloseButtonLabel')}
      dismissAriaLabel={translate('cells.uploadStatus.closeAriaLabel')}
      canDismiss={canDismissUploadStatus}
      retryLabel={translate('conversationFilePreviewErrorRetry')}
      isCancelling={isCancelling}
      isRetrying={(uploadId: string) => childUploadIds(uploadId).some(id => retryingUploadIds.has(id))}
      onToggle={() => setIsExpanded(expanded => !expanded)}
      onCancelAll={cancelAllUploads}
      onCancelUpload={cancelUpload}
      onRetry={retryUpload}
      onDismissAll={() => dismissUpload({conversationQualifiedId, uploadId: representativeUpload.uploadId})}
      onDismissRow={dismissRow}
    />
  );
};
