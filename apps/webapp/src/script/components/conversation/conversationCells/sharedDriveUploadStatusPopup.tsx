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

import {AlertIcon, ChevronIcon, CloseIcon, ReloadIcon, UploadIcon} from '@wireapp/react-ui-kit';

import {FileTypeIcon} from 'Components/conversation/common/fileTypeIcon/fileTypeIcon';
import {getFileExtension} from 'Util/util';

import type {SharedDriveUploadStatus} from './sharedDriveUploadStatus';
import {
  sharedDriveUploadStatusPopupContentStyles,
  sharedDriveUploadStatusPopupDeterminateProgressStyles,
  sharedDriveUploadStatusPopupDestinationStyles,
  sharedDriveUploadStatusPopupHeaderActionsStyles,
  sharedDriveUploadStatusPopupHeaderCancelStyles,
  sharedDriveUploadStatusPopupProgressStyles,
  sharedDriveUploadStatusPopupErrorIconInnerStyles,
  sharedDriveUploadStatusPopupErrorIconStyles,
  sharedDriveUploadStatusPopupRowActionButtonStyles,
  sharedDriveUploadStatusPopupRowActionIconStyles,
  sharedDriveUploadStatusPopupRowActionsStyles,
  sharedDriveUploadStatusPopupRowCancelStyles,
  sharedDriveUploadStatusPopupRowFileNameStyles,
  sharedDriveUploadStatusPopupRowIconStyles,
  sharedDriveUploadStatusPopupRowLeadingStyles,
  sharedDriveUploadStatusPopupRowStatusStyles,
  sharedDriveUploadStatusPopupRowStyles,
  sharedDriveUploadStatusPopupRowTextStyles,
  sharedDriveUploadStatusPopupStyles,
  sharedDriveUploadStatusPopupTextStyles,
  sharedDriveUploadStatusPopupTitleStyles,
  sharedDriveUploadStatusPopupToggleIconStyles,
  sharedDriveUploadStatusPopupToggleStyles,
} from './sharedDriveUploadStatusPopup.styles';

const PROGRESS_PERCENTAGE_MAX = 100;

const getProgressTransform = (progress: number): string => `scaleX(${Math.min(1, Math.max(0, progress))})`;

interface SharedDriveUploadStatusPopupProps {
  readonly upload: SharedDriveUploadStatus;
  readonly title: string;
  readonly statusLabel: string;
  readonly destination: string;
  readonly isExpanded: boolean;
  readonly toggleLabel: string;
  readonly cancelLabel: string;
  readonly dismissLabel?: string;
  readonly retryLabel: string;
  readonly isCancelling: boolean;
  readonly isRetrying: boolean;
  readonly onToggle: () => void;
  readonly onCancel: () => void;
  readonly onRetry: () => void;
  readonly onDismiss?: () => void;
}

const statusIcon = (upload: SharedDriveUploadStatus): ReactNode => {
  if (upload.kind === 'uploading') {
    return (
      <UploadIcon
        css={sharedDriveUploadStatusPopupRowIconStyles}
        color="currentColor"
        aria-hidden="true"
        data-uie-name="shared-drive-upload-uploading"
      />
    );
  }

  if (upload.kind === 'uploaded') {
    return (
      <div
        css={sharedDriveUploadStatusPopupRowIconStyles}
        aria-hidden="true"
        data-uie-name="shared-drive-upload-uploaded"
      >
        <FileTypeIcon extension={getFileExtension(upload.fileName) || 'pdf'} size={24} />
      </div>
    );
  }

  return (
    <div
      css={sharedDriveUploadStatusPopupErrorIconStyles}
      aria-hidden="true"
      data-uie-name="shared-drive-upload-failed"
    >
      <AlertIcon css={sharedDriveUploadStatusPopupErrorIconInnerStyles} color="currentColor" />
    </div>
  );
};

export const SharedDriveUploadStatusPopup = ({
  upload,
  title,
  statusLabel,
  destination,
  isExpanded,
  toggleLabel,
  cancelLabel,
  dismissLabel = cancelLabel,
  retryLabel,
  isCancelling,
  isRetrying,
  onToggle,
  onCancel,
  onRetry,
  onDismiss,
}: SharedDriveUploadStatusPopupProps) => {
  const statusRowId = `shared-drive-upload-status-${upload.uploadId}`;
  const progressIndicator = (() => {
    if (upload.isTransferActive && upload.hasProgress) {
      return (
        <div
          role="progressbar"
          aria-label={upload.fileName}
          aria-valuemin={0}
          aria-valuemax={PROGRESS_PERCENTAGE_MAX}
          aria-valuenow={Math.round(upload.progress * PROGRESS_PERCENTAGE_MAX)}
          css={sharedDriveUploadStatusPopupDeterminateProgressStyles(isExpanded)}
          style={{transform: getProgressTransform(upload.progress)}}
          data-testid="shared-drive-upload-progress"
          data-uie-name="shared-drive-upload-progress"
        />
      );
    }

    if (upload.isTransferActive) {
      return (
        <div
          role="progressbar"
          aria-label={upload.fileName}
          css={sharedDriveUploadStatusPopupProgressStyles(isExpanded)}
          data-testid="shared-drive-upload-progress"
          data-uie-name="shared-drive-upload-progress"
        />
      );
    }

    if (upload.kind !== 'uploading') {
      return (
        <div
          css={sharedDriveUploadStatusPopupProgressStyles(isExpanded, upload.kind)}
          data-testid="shared-drive-upload-progress"
          data-uie-name="shared-drive-upload-progress"
        />
      );
    }

    return null;
  })();

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
        <div css={sharedDriveUploadStatusPopupHeaderActionsStyles}>
          {upload.canCancel && (
            <button
              type="button"
              css={sharedDriveUploadStatusPopupHeaderCancelStyles}
              disabled={isCancelling}
              data-uie-name="shared-drive-upload-header-cancel"
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
          )}
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
      </div>
      <div
        id={statusRowId}
        css={sharedDriveUploadStatusPopupRowStyles}
        data-uie-name="shared-drive-upload-status-row"
        hidden={!isExpanded}
      >
        <div css={sharedDriveUploadStatusPopupRowLeadingStyles}>
          {statusIcon(upload)}
          <div css={sharedDriveUploadStatusPopupRowTextStyles}>
            <strong css={sharedDriveUploadStatusPopupRowFileNameStyles} title={upload.fileName}>
              {upload.fileName}
            </strong>
            <span css={sharedDriveUploadStatusPopupRowStatusStyles(upload.kind)} title={statusLabel}>
              {statusLabel}
            </span>
          </div>
        </div>
        <div css={sharedDriveUploadStatusPopupRowActionsStyles}>
          {upload.canRetry && (
            <button
              type="button"
              css={sharedDriveUploadStatusPopupRowActionButtonStyles}
              aria-label={retryLabel}
              disabled={isRetrying}
              data-uie-name="shared-drive-upload-retry"
              onClick={onRetry}
            >
              <ReloadIcon
                css={sharedDriveUploadStatusPopupRowActionIconStyles}
                color="currentColor"
                aria-hidden="true"
              />
            </button>
          )}
          {upload.canRetry && (
            <button
              type="button"
              css={sharedDriveUploadStatusPopupRowActionButtonStyles}
              aria-label={dismissLabel}
              data-uie-name="shared-drive-upload-dismiss"
              onClick={() => onDismiss?.()}
            >
              <CloseIcon
                css={sharedDriveUploadStatusPopupRowActionIconStyles}
                color="currentColor"
                aria-hidden="true"
              />
            </button>
          )}
          {upload.canCancel && (
            <button
              type="button"
              css={sharedDriveUploadStatusPopupRowCancelStyles}
              aria-label={cancelLabel}
              disabled={isCancelling}
              data-uie-name="shared-drive-upload-cancel"
              onClick={onCancel}
            >
              <CloseIcon color="currentColor" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {progressIndicator}
    </div>
  );
};
