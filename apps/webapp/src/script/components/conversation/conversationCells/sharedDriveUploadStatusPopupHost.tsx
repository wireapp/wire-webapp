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

import {isNull} from '@sindresorhus/is';
import {Maybe, maybe} from 'true-myth';

import {useApplicationContext} from 'src/script/page/rootProvider';
import type {Translate} from 'Util/localizerUtil';
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

const getRowStatusLabel = (
  row: SharedDriveUploadStatus,
  translate: Translate,
  statusLabelKey: Record<SharedDriveUploadStatusKind, Parameters<Translate>[0]>,
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
      uploaded: row.uploadedFileCount,
      total: row.fileCount,
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
  const readStatuses = useCallback(() => {
    return getSharedDriveUploadStatuses(controller, conversationQualifiedId);
  }, [controller, conversationQualifiedId]);
  const [uploadSnapshot, setUploadSnapshot] = useState(() => {
    return {conversationQualifiedId, uploads: readStatuses()};
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [cancellingUploadIds, setCancellingUploadIds] = useState<ReadonlySet<string>>(() => {
    return new Set();
  });
  const [retryingUploadIds, setRetryingUploadIds] = useState<ReadonlySet<string>>(() => {
    return new Set();
  });
  const [dismissedRowIds, setDismissedRowIds] = useState<ReadonlySet<string>>(() => {
    return new Set();
  });
  const [localDismissedUpload, setLocalDismissedUpload] = useState<Maybe<DismissedUpload>>(Maybe.nothing());
  const dismissedUpload = isProvided ? contextDismissedUpload : localDismissedUpload;
  const dismissUpload = useCallback(
    (upload: DismissedUpload) => {
      setLocalDismissedUpload(Maybe.just(upload));
      onDismissUpload(upload);
      controller.dismiss?.(upload.conversationQualifiedId, upload.uploadId);
    },
    [controller, onDismissUpload],
  );
  const rawUploads =
    uploadSnapshot.conversationQualifiedId === conversationQualifiedId ? uploadSnapshot.uploads : readStatuses();
  const uploads = getSharedDriveUploadDisplayStatuses(rawUploads);
  const visibleUploads = uploads.filter(({uploadId}) => {
    return !dismissedRowIds.has(uploadId);
  });
  const aggregateKind = getSharedDriveUploadAggregateKind(visibleUploads);
  const representativeUpload = !isNull(aggregateKind)
    ? getRepresentativeSharedDriveUploadStatus(visibleUploads, aggregateKind)
    : null;
  const canDismissUploadStatus =
    visibleUploads.length > 0 &&
    visibleUploads.every(({kind}) => {
      return kind === 'uploaded';
    });
  const isUploadDismissed =
    (maybe.isJust(dismissedUpload) &&
      dismissedUpload.value.conversationQualifiedId === conversationQualifiedId &&
      representativeUpload?.uploadId === dismissedUpload.value.uploadId) ||
    (!isNull(representativeUpload) &&
      controller.isDismissed?.(conversationQualifiedId, representativeUpload.uploadId) === true);

  const isCancelling = useCallback(
    (uploadId: string): boolean => {
      const row = visibleUploads.find(upload => {
        return upload.uploadId === uploadId;
      });
      return (
        row?.cancellableUploadIds.some(childUploadId => {
          return cancellingUploadIds.has(childUploadId);
        }) ?? false
      );
    },
    [cancellingUploadIds, visibleUploads],
  );
  const cancellableUploadIds = useCallback(
    (uploadId: string): readonly string[] => {
      return (
        visibleUploads.find(upload => {
          return upload.uploadId === uploadId;
        })?.cancellableUploadIds ?? []
      );
    },
    [visibleUploads],
  );
  const retryableUploads = useCallback(
    (uploadId: string) => {
      return (
        visibleUploads.find(upload => {
          return upload.uploadId === uploadId;
        })?.retryableUploads ?? []
      );
    },
    [visibleUploads],
  );
  const cancelUploadIds = useCallback(
    (uploadIds: readonly string[]): void => {
      const pendingIds = uploadIds
        .flatMap(uploadId => {
          return cancellableUploadIds(uploadId);
        })
        .filter(uploadId => {
          return !cancellingUploadIds.has(uploadId);
        });
      if (pendingIds.length === 0) {
        return;
      }

      setCancellingUploadIds(current => {
        return new Set([...current, ...pendingIds]);
      });
      const finishCancellation = (uploadId: string) => {
        return setCancellingUploadIds(current => {
          const next = new Set(current);
          next.delete(uploadId);
          return next;
        });
      };
      pendingIds.forEach(uploadId => {
        void Promise.resolve()
          .then(() => {
            return controller.cancel(uploadId);
          })
          .then(
            () => {
              return finishCancellation(uploadId);
            },
            () => {
              return finishCancellation(uploadId);
            },
          );
      });
    },
    [cancellableUploadIds, cancellingUploadIds, controller],
  );
  const cancelAllUploads = useCallback((): void => {
    return cancelUploadIds(
      visibleUploads.map(({uploadId}) => {
        return uploadId;
      }),
    );
  }, [cancelUploadIds, visibleUploads]);
  const cancelUpload = useCallback(
    (uploadId: string): void => {
      return cancelUploadIds([uploadId]);
    },
    [cancelUploadIds],
  );

  const dismissRow = useCallback((uploadId: string): void => {
    setDismissedRowIds(current => {
      return new Set([...current, uploadId]);
    });
  }, []);

  const retryUpload = useCallback(
    (uploadId: string): void => {
      const uploadsToRetry = retryableUploads(uploadId);
      if (
        uploadsToRetry.some(upload => {
          return retryingUploadIds.has(upload.uploadId);
        })
      ) {
        return;
      }

      setRetryingUploadIds(current => {
        return new Set([
          ...current,
          ...uploadsToRetry.map(upload => {
            return upload.uploadId;
          }),
        ]);
      });
      const finishRetry = (id: string) => {
        return setRetryingUploadIds(current => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      };
      uploadsToRetry.forEach(upload => {
        const retry = upload.action === 'publish' ? controller.retryPublish : controller.retryUpload;
        void retry(upload.uploadId).then(
          () => {
            return finishRetry(upload.uploadId);
          },
          () => {
            return finishRetry(upload.uploadId);
          },
        );
      });
    },
    [controller, retryableUploads, retryingUploadIds],
  );

  useEffect(() => {
    const updateStatus = () => {
      return setUploadSnapshot({conversationQualifiedId, uploads: readStatuses()});
    };
    updateStatus();
    return controller.subscribe(updateStatus);
  }, [controller, conversationQualifiedId, readStatuses]);

  if (!isEnabled || !isFileTabActive || isNull(representativeUpload) || isUploadDismissed || isNull(aggregateKind)) {
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
    visibleUploads.map(row => {
      return [row.uploadId, getRowStatusLabel(row, translate, statusLabelKey)];
    }),
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
      isRetrying={(uploadId: string) => {
        return retryableUploads(uploadId).some(upload => {
          return retryingUploadIds.has(upload.uploadId);
        });
      }}
      onToggle={() => {
        return setIsExpanded(expanded => {
          return !expanded;
        });
      }}
      onCancelAll={cancelAllUploads}
      onCancelUpload={cancelUpload}
      onRetry={retryUpload}
      onDismissAll={() => {
        return dismissUpload({conversationQualifiedId, uploadId: representativeUpload.uploadId});
      }}
      onDismissRow={dismissRow}
    />
  );
};
