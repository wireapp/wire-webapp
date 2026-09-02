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

import {AlertIcon, ChevronIcon, UploadIcon} from '@wireapp/react-ui-kit';

import {FileTypeIcon} from 'Components/conversation/common/fileTypeIcon/fileTypeIcon';
import {getFileExtension} from 'Util/getFileExtension';

import type {SharedDriveUploadStatus} from './sharedDriveUploadStatus';
import {
  sharedDriveUploadStatusPopupContentStyles,
  sharedDriveUploadStatusPopupDestinationStyles,
  sharedDriveUploadStatusPopupProgressStyles,
  sharedDriveUploadStatusPopupRowFileNameStyles,
  sharedDriveUploadStatusPopupRowIconStyles,
  sharedDriveUploadStatusPopupRowStatusStyles,
  sharedDriveUploadStatusPopupRowStyles,
  sharedDriveUploadStatusPopupRowTextStyles,
  sharedDriveUploadStatusPopupStyles,
  sharedDriveUploadStatusPopupTextStyles,
  sharedDriveUploadStatusPopupTitleStyles,
  sharedDriveUploadStatusPopupToggleIconStyles,
  sharedDriveUploadStatusPopupToggleStyles,
} from './sharedDriveUploadStatusPopup.styles';

interface SharedDriveUploadStatusPopupProps {
  readonly upload: SharedDriveUploadStatus;
  readonly title: string;
  readonly statusLabel: string;
  readonly destination: string;
  readonly isExpanded: boolean;
  readonly toggleLabel: string;
  readonly onToggle: () => void;
}

const statusIcon = (upload: SharedDriveUploadStatus): ReactNode => {
  if (upload.kind === 'uploading') {
    return (
      <UploadIcon
        css={sharedDriveUploadStatusPopupRowIconStyles}
        color="currentColor"
        data-uie-name="shared-drive-upload-uploading"
      />
    );
  }

  if (upload.kind === 'uploaded') {
    return (
      <div css={sharedDriveUploadStatusPopupRowIconStyles} data-uie-name="shared-drive-upload-uploaded">
        <FileTypeIcon extension={getFileExtension(upload.fileName)} size={24} />
      </div>
    );
  }

  return (
    <AlertIcon
      css={sharedDriveUploadStatusPopupRowIconStyles}
      color="currentColor"
      data-uie-name="shared-drive-upload-failed"
    />
  );
};

export const SharedDriveUploadStatusPopup = ({
  upload,
  title,
  statusLabel,
  destination,
  isExpanded,
  toggleLabel,
  onToggle,
}: SharedDriveUploadStatusPopupProps) => {
  const statusRowId = `shared-drive-upload-status-${upload.uploadId}`;

  return (
    <div css={sharedDriveUploadStatusPopupStyles} data-uie-name="shared-drive-upload-status-popup">
      <div
        css={sharedDriveUploadStatusPopupContentStyles}
        data-uie-name="shared-drive-upload-status-header"
        data-testid="shared-drive-upload-status-header"
      >
        <div css={sharedDriveUploadStatusPopupTextStyles} role="status" aria-live="polite">
          <strong css={sharedDriveUploadStatusPopupTitleStyles} title={title}>
            {title}
          </strong>
          <span css={sharedDriveUploadStatusPopupDestinationStyles} title={destination}>
            {destination}
          </span>
        </div>
        <button
          type="button"
          css={sharedDriveUploadStatusPopupToggleStyles}
          aria-label={toggleLabel}
          aria-expanded={isExpanded}
          aria-controls={statusRowId}
          data-uie-name="shared-drive-upload-status-toggle"
          onClick={onToggle}
        >
          <ChevronIcon
            direction={isExpanded ? 'down' : 'up'}
            css={sharedDriveUploadStatusPopupToggleIconStyles}
            color="currentColor"
            aria-hidden="true"
          />
        </button>
      </div>
      <div
        id={statusRowId}
        css={sharedDriveUploadStatusPopupRowStyles}
        data-uie-name="shared-drive-upload-status-row"
        hidden={!isExpanded}
      >
        {statusIcon(upload)}
        <div css={sharedDriveUploadStatusPopupRowTextStyles}>
          <strong css={sharedDriveUploadStatusPopupRowFileNameStyles}>{upload.fileName}</strong>
          <span css={sharedDriveUploadStatusPopupRowStatusStyles(upload.kind)}>{statusLabel}</span>
        </div>
      </div>
      {upload.kind === 'uploading' && (
        <div css={sharedDriveUploadStatusPopupProgressStyles} data-uie-name="shared-drive-upload-progress" />
      )}
    </div>
  );
};
