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
import {getLatestSharedDriveUploadStatus, getSharedDriveUploadStatuses} from './sharedDriveUploadStatus';
import {SharedDriveUploadStatusPopup} from './sharedDriveUploadStatusPopup';

type DismissedUpload = {
  readonly conversationQualifiedId: string;
  readonly uploadId: string;
};

interface SharedDriveUploadStatusPopupHostProps {
  readonly controller: SharedDriveUploadController;
  readonly conversationQualifiedId: string;
  readonly isEnabled: boolean;
  readonly isFileTabActive: boolean;
}

export const SharedDriveUploadStatusPopupHost = ({
  controller,
  conversationQualifiedId,
  isEnabled,
  isFileTabActive,
}: SharedDriveUploadStatusPopupHostProps) => {
  const {translate} = useApplicationContext();
  const readStatus = useCallback(
    () => getLatestSharedDriveUploadStatus(controller, conversationQualifiedId),
    [controller, conversationQualifiedId],
  );
  const [status, setStatus] = useState(() => ({
    conversationQualifiedId,
    upload: readStatus(),
  }));
  const [isExpanded, setIsExpanded] = useState(false);
  const [cancellingUploadId, setCancellingUploadId] = useState<Maybe<string>>(Maybe.nothing());
  const [retryingUploadId, setRetryingUploadId] = useState<Maybe<string>>(Maybe.nothing());
  const [dismissedUpload, setDismissedUpload] = useState<Maybe<DismissedUpload>>(Maybe.nothing());
  const upload = status.conversationQualifiedId === conversationQualifiedId ? status.upload : readStatus();
  const uploadStatuses = getSharedDriveUploadStatuses(controller, conversationQualifiedId);
  const canDismissUploadStatus =
    upload !== null && uploadStatuses.length > 0 && uploadStatuses.every(({kind}) => kind === 'uploaded');
  const isUploadDismissed =
    maybe.isJust(dismissedUpload) &&
    dismissedUpload.value.conversationQualifiedId === conversationQualifiedId &&
    upload !== null &&
    dismissedUpload.value.uploadId === upload.uploadId;

  const cancelUpload = useCallback(
    (uploadId: string): void => {
      if (maybe.isJust(cancellingUploadId)) {
        return;
      }

      setDismissedUpload(Maybe.just({conversationQualifiedId, uploadId}));
      setCancellingUploadId(Maybe.just(uploadId));
      const finishCancellation = () =>
        setCancellingUploadId(current =>
          maybe.isJust(current) && current.value === uploadId ? Maybe.nothing() : current,
        );
      void controller.cancel(uploadId).then(finishCancellation, finishCancellation);
    },
    [cancellingUploadId, controller, conversationQualifiedId],
  );

  const retryUpload = useCallback(
    (uploadId: string): void => {
      if (maybe.isJust(retryingUploadId)) {
        return;
      }

      setRetryingUploadId(Maybe.just(uploadId));
      const finishRetry = () =>
        setRetryingUploadId(current =>
          maybe.isJust(current) && current.value === uploadId ? Maybe.nothing() : current,
        );
      const snapshot = controller
        .snapshots(conversationQualifiedId)
        .find(state => state.identity.uploadId === uploadId);
      const retry = snapshot?.kind === 'publishFailed' ? controller.retryPublish : controller.retryUpload;
      void retry(uploadId).then(finishRetry, finishRetry);
    },
    [controller, conversationQualifiedId, retryingUploadId],
  );

  useEffect(() => {
    const updateStatus = () => setStatus({conversationQualifiedId, upload: readStatus()});
    updateStatus();
    return controller.subscribe(updateStatus);
  }, [controller, conversationQualifiedId, readStatus]);

  if (!isEnabled || !isFileTabActive || !upload || isUploadDismissed) {
    return null;
  }

  const titleKey = {
    uploading: 'cells.uploadStatus.uploading',
    uploaded: 'cells.uploadStatus.uploaded',
    failed: 'cells.uploadStatus.failed',
  } as const;
  const statusLabelKey = {
    uploading: 'cells.uploadStatus.uploadingSize',
    uploaded: 'cells.uploadStatus.uploadedSize',
    failed: 'cells.uploadStatus.failedLabel',
  } as const;

  const statusLabel =
    upload.kind === 'failed'
      ? translate(statusLabelKey.failed)
      : translate(statusLabelKey[upload.kind], {size: formatBytes(upload.fileSize)});

  return (
    <SharedDriveUploadStatusPopup
      upload={upload}
      title={translate(titleKey[upload.kind], {name: upload.fileName})}
      statusLabel={statusLabel}
      destination={translate('cells.uploadStatus.destination', {destination: translate('cells.sharedDrive.title')})}
      isExpanded={isExpanded}
      toggleLabel={translate(isExpanded ? 'cells.uploadStatus.collapse' : 'cells.uploadStatus.expand')}
      cancelLabel={translate('conversationAssetUploadCancel')}
      dismissLabel={translate('fileCardDefaultCloseButtonLabel')}
      dismissAriaLabel={translate('cells.uploadStatus.closeAriaLabel')}
      canDismiss={canDismissUploadStatus}
      retryLabel={translate('conversationFilePreviewErrorRetry')}
      isCancelling={maybe.isJust(cancellingUploadId) && cancellingUploadId.value === upload.uploadId}
      isRetrying={maybe.isJust(retryingUploadId) && retryingUploadId.value === upload.uploadId}
      onToggle={() => setIsExpanded(expanded => !expanded)}
      onCancel={() => cancelUpload(upload.uploadId)}
      onRetry={() => retryUpload(upload.uploadId)}
      onDismiss={() => setDismissedUpload(Maybe.just({conversationQualifiedId, uploadId: upload.uploadId}))}
    />
  );
};
