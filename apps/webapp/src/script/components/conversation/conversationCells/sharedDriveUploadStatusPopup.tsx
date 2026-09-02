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

import type {ReactNode} from 'react';

import {CheckIcon, InfoIcon} from 'Components/icon';

import type {SharedDriveUploadStatus} from './sharedDriveUploadStatus';
import {
  sharedDriveUploadStatusPopupContentStyles,
  sharedDriveUploadStatusPopupDestinationStyles,
  sharedDriveUploadStatusPopupIconStyles,
  sharedDriveUploadStatusPopupProgressStyles,
  sharedDriveUploadStatusPopupStyles,
  sharedDriveUploadStatusPopupTextStyles,
  sharedDriveUploadStatusPopupTitleStyles,
} from './sharedDriveUploadStatusPopup.styles';

interface SharedDriveUploadStatusPopupProps {
  readonly upload: SharedDriveUploadStatus;
  readonly title: string;
  readonly destination: string;
}

const statusIcon = (kind: SharedDriveUploadStatus['kind']): ReactNode => {
  if (kind === 'uploaded') {
    return <CheckIcon css={sharedDriveUploadStatusPopupIconStyles} data-uie-name="shared-drive-upload-success" />;
  }

  if (kind === 'failed') {
    return <InfoIcon css={sharedDriveUploadStatusPopupIconStyles} data-uie-name="shared-drive-upload-failure" />;
  }

  return null;
};

export const SharedDriveUploadStatusPopup = ({upload, title, destination}: SharedDriveUploadStatusPopupProps) => (
  <div
    css={sharedDriveUploadStatusPopupStyles}
    data-uie-name="shared-drive-upload-status-popup"
    role="status"
    aria-live="polite"
  >
    <div css={sharedDriveUploadStatusPopupContentStyles}>
      <div css={sharedDriveUploadStatusPopupTextStyles}>
        <strong css={sharedDriveUploadStatusPopupTitleStyles}>{title}</strong>
        <span css={sharedDriveUploadStatusPopupDestinationStyles}>{destination}</span>
      </div>
      {statusIcon(upload.kind)}
    </div>
    {upload.kind === 'uploading' && (
      <div css={sharedDriveUploadStatusPopupProgressStyles} data-uie-name="shared-drive-upload-progress" />
    )}
  </div>
);
