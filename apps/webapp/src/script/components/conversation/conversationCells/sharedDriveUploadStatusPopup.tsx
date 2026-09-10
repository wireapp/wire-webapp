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

import {AlertIcon, ChevronIcon, CloseIcon, ReloadIcon} from '@wireapp/react-ui-kit';

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
  sharedDriveUploadStatusPopupUploadSpinnerStyles,
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

const UploadingStatusIcon = () => (
  <svg
    css={sharedDriveUploadStatusPopupRowIconStyles}
    width="24"
    height="25"
    viewBox="0 0 24 25"
    fill="none"
    aria-hidden="true"
    data-uie-name="shared-drive-upload-uploading"
  >
    <circle cx="12" cy="12" r="11.25" stroke="var(--accent-color-highlight, #e7f0fa)" strokeWidth="1.5" />
    <g css={sharedDriveUploadStatusPopupUploadSpinnerStyles}>
      <path
        d="M12.2792 0.88967C18.4591 1.03197 23.3536 6.15716 23.2113 12.3371C23.069 18.517 17.9438 23.4115 11.7639 23.2692C9.49701 23.217 7.40313 22.4944 5.66734 21.2952"
        stroke="var(--accent-color, #0667c8)"
        strokeWidth="1.5"
      />
    </g>
    <path
      d="M11.3418 9.91852L7.90336 13.3569L6.97528 12.4289L12.0001 7.40405L17.0249 12.4289L16.0968 13.3569L12.6543 9.91439L12.6543 16.5916L11.3418 16.5916L11.3418 9.91852Z"
      fill="var(--accent-color, #0667c8)"
    />
  </svg>
);

const statusIcon = (upload: SharedDriveUploadStatus): ReactNode => {
  if (upload.kind === 'uploading') {
    return <UploadingStatusIcon />;
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
