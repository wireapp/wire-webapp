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
import {toSharedDriveUploadStatus, type SharedDriveUploadStatus} from './sharedDriveUploadStatus';
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

const getLatestStatus = (
  controller: SharedDriveUploadController,
  conversationQualifiedId: string,
): SharedDriveUploadStatus | null => {
  const statuses = controller.snapshots(conversationQualifiedId).flatMap(snapshot => {
    const status = toSharedDriveUploadStatus(snapshot, conversationQualifiedId);
    return status ? [status] : [];
  });

  return statuses[statuses.length - 1] ?? null;
};

export const SharedDriveUploadStatusPopupHost = ({
  controller,
  conversationQualifiedId,
  isEnabled,
  isFileTabActive,
}: SharedDriveUploadStatusPopupHostProps) => {
  const {translate} = useApplicationContext();
  const readStatus = useCallback(
    () => getLatestStatus(controller, conversationQualifiedId),
    [controller, conversationQualifiedId],
  );
  const [status, setStatus] = useState(() => ({
    conversationQualifiedId,
    upload: readStatus(),
  }));
  const [isExpanded, setIsExpanded] = useState(false);
  const [cancellingUploadId, setCancellingUploadId] = useState<Maybe<string>>(Maybe.nothing());
  const [dismissedUpload, setDismissedUpload] = useState<Maybe<DismissedUpload>>(Maybe.nothing());
  const upload = status.conversationQualifiedId === conversationQualifiedId ? status.upload : readStatus();
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
      isCancelling={maybe.isJust(cancellingUploadId) && cancellingUploadId.value === upload.uploadId}
      onToggle={() => setIsExpanded(expanded => !expanded)}
      onCancel={() => cancelUpload(upload.uploadId)}
    />
  );
};
