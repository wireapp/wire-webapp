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

import {useApplicationContext} from 'src/script/page/rootProvider';

import type {SharedDriveUploadController} from './sharedDriveUploadController';
import {toSharedDriveUploadStatus, type SharedDriveUploadStatus} from './sharedDriveUploadStatus';
import {SharedDriveUploadStatusPopup} from './sharedDriveUploadStatusPopup';

interface SharedDriveUploadStatusPopupHostProps {
  readonly controller: SharedDriveUploadController;
  readonly conversationQualifiedId: string;
  readonly isEnabled: boolean;
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
  const upload = status.conversationQualifiedId === conversationQualifiedId ? status.upload : readStatus();

  useEffect(() => {
    const updateStatus = () => setStatus({conversationQualifiedId, upload: readStatus()});
    updateStatus();
    return controller.subscribe(updateStatus);
  }, [controller, conversationQualifiedId, readStatus]);

  if (!isEnabled || !upload) {
    return null;
  }

  const titleKey = {
    uploading: 'cells.uploadStatus.uploading',
    uploaded: 'cells.uploadStatus.uploaded',
    failed: 'cells.uploadStatus.failed',
  } as const;

  return (
    <SharedDriveUploadStatusPopup
      upload={upload}
      title={translate(titleKey[upload.kind], {name: upload.fileName})}
      destination={translate('cells.uploadStatus.destination', {destination: translate('cells.sharedDrive.title')})}
    />
  );
};
