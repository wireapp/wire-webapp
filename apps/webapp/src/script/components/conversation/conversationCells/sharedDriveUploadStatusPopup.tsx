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

import {
  AlertIcon,
  ChevronIcon,
  CloseIcon,
  FolderIcon,
  ReloadIcon,
  SharedDriveUploadStatusIcon,
} from '@wireapp/react-ui-kit';

import {FileTypeIcon} from 'Components/conversation/common/fileTypeIcon/fileTypeIcon';
import {getFileExtension} from 'Util/util';

import type {SharedDriveUploadStatus, SharedDriveUploadStatusKind} from './sharedDriveUploadStatus';
import {
  sharedDriveUploadStatusPopupContentStyles,
  sharedDriveUploadStatusPopupDeterminateProgressStyles,
  sharedDriveUploadStatusPopupDestinationStyles,
  sharedDriveUploadStatusPopupHeaderActionsStyles,
  sharedDriveUploadStatusPopupHeaderCancelStyles,
  sharedDriveUploadStatusPopupProgressStyles,
  sharedDriveUploadStatusPopupErrorIconInnerStyles,
  sharedDriveUploadStatusPopupErrorIconStyles,
  sharedDriveUploadStatusPopupFailedRowActionsStyles,
  sharedDriveUploadStatusPopupRowActionButtonStyles,
  sharedDriveUploadStatusPopupRowActionIconStyles,
  sharedDriveUploadStatusPopupRowActionsStyles,
  sharedDriveUploadStatusPopupRowCancelStyles,
  sharedDriveUploadStatusPopupRowFileNameStyles,
  sharedDriveUploadStatusPopupRowIconStyles,
  sharedDriveUploadStatusPopupRowLeadingStyles,
  sharedDriveUploadStatusPopupRowStatusStyles,
  sharedDriveUploadStatusPopupRowStyles,
  sharedDriveUploadStatusPopupRowsStyles,
  sharedDriveUploadStatusPopupRowTextStyles,
  sharedDriveUploadStatusPopupStyles,
  sharedDriveUploadStatusPopupTextStyles,
  sharedDriveUploadStatusPopupTitleStyles,
  sharedDriveUploadStatusPopupToggleIconStyles,
  sharedDriveUploadStatusPopupToggleStyles,
} from './sharedDriveUploadStatusPopup.styles';

const PROGRESS_PERCENTAGE_MAX = 100;

type UploadActionState = boolean | ((uploadId: string) => boolean);

const getProgressTransform = (progress: number): string => `scaleX(${Math.min(1, Math.max(0, progress))})`;

interface SharedDriveUploadStatusPopupProps {
  /** The representative status used for the collapsed header and backwards compatibility. */
  readonly upload: SharedDriveUploadStatus;
  readonly uploads?: readonly SharedDriveUploadStatus[];
  readonly aggregateKind?: SharedDriveUploadStatusKind;
  readonly title: string;
  readonly statusLabel: string;
  readonly statusLabels?: ReadonlyMap<string, string>;
  readonly destination: string;
  readonly isExpanded: boolean;
  readonly toggleLabel: string;
  readonly cancelLabel: string;
  readonly headerCancelLabel?: string;
  readonly dismissLabel?: string;
  readonly dismissAriaLabel?: string;
  readonly canDismiss?: boolean;
  readonly retryLabel: string;
  readonly isCancelling: UploadActionState;
  readonly isRetrying: UploadActionState;
  readonly onToggle: () => void;
  readonly onCancelAll: () => void;
  readonly onCancelUpload: (uploadId: string) => void;
  readonly onRetry: (uploadId: string) => void;
  readonly onDismissAll?: () => void;
  readonly onDismissRow?: (uploadId: string) => void;
}

const isActionPending = (state: UploadActionState, uploadId: string): boolean =>
  typeof state === 'function' ? state(uploadId) : state;

const statusIcon = (upload: SharedDriveUploadStatus): ReactNode => {
  if (upload.isFolder && upload.kind !== 'failed') {
    return <FolderIcon css={sharedDriveUploadStatusPopupRowIconStyles} aria-hidden="true" />;
  }

  if (upload.kind === 'uploading' || upload.kind === 'queued') {
    return (
      <SharedDriveUploadStatusIcon
        css={sharedDriveUploadStatusPopupRowIconStyles}
        aria-hidden="true"
        data-uie-name={`shared-drive-upload-${upload.kind}`}
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

const renderProgress = (upload: SharedDriveUploadStatus, isExpanded: boolean): ReactNode => {
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

  if (upload.kind !== 'queued') {
    return (
      <div
        css={sharedDriveUploadStatusPopupProgressStyles(isExpanded, upload.kind)}
        data-testid="shared-drive-upload-progress"
        data-uie-name="shared-drive-upload-progress"
      />
    );
  }

  return null;
};

export const SharedDriveUploadStatusPopup = ({
  upload,
  uploads = [upload],
  aggregateKind = upload.kind,
  title,
  statusLabel,
  statusLabels,
  destination,
  isExpanded,
  toggleLabel,
  cancelLabel,
  headerCancelLabel = cancelLabel,
  dismissLabel = cancelLabel,
  dismissAriaLabel = dismissLabel,
  canDismiss = upload.kind === 'uploaded',
  retryLabel,
  isCancelling,
  isRetrying,
  onToggle,
  onCancelAll,
  onCancelUpload,
  onRetry,
  onDismissAll,
  onDismissRow,
}: SharedDriveUploadStatusPopupProps) => {
  const statusRowId =
    uploads.length === 1 ? `shared-drive-upload-status-${upload.uploadId}` : 'shared-drive-upload-status-rows';
  const rowStatusLabel = (row: SharedDriveUploadStatus): string => statusLabels?.get(row.uploadId) ?? statusLabel;

  return (
    <div css={sharedDriveUploadStatusPopupStyles} data-uie-name="shared-drive-upload-status-popup">
      <div
        css={sharedDriveUploadStatusPopupContentStyles}
        data-uie-name="shared-drive-upload-status-header"
        data-testid="shared-drive-upload-status-header"
      >
        <div
          className="shared-drive-upload-status-popup__header-text"
          css={sharedDriveUploadStatusPopupTextStyles}
          role="status"
          aria-live="polite"
        >
          <strong css={sharedDriveUploadStatusPopupTitleStyles} title={title}>
            {title}
          </strong>
          <span css={sharedDriveUploadStatusPopupDestinationStyles} title={destination}>
            {destination}
          </span>
        </div>
        <div css={sharedDriveUploadStatusPopupHeaderActionsStyles}>
          {uploads.some(row => row.canCancel) && (
            <button
              type="button"
              css={sharedDriveUploadStatusPopupHeaderCancelStyles}
              disabled={uploads.some(row => isActionPending(isCancelling, row.uploadId))}
              data-uie-name="shared-drive-upload-header-cancel"
              onClick={onCancelAll}
            >
              {headerCancelLabel}
            </button>
          )}
          {canDismiss && (
            <button
              type="button"
              css={sharedDriveUploadStatusPopupHeaderCancelStyles}
              aria-label={dismissAriaLabel}
              data-uie-name="shared-drive-upload-header-dismiss"
              onClick={onDismissAll}
            >
              {dismissLabel}
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
      {isExpanded && renderProgress(upload, true)}
      <div
        id={statusRowId}
        css={sharedDriveUploadStatusPopupRowsStyles}
        data-uie-name="shared-drive-upload-status-rows"
        hidden={!isExpanded}
      >
        {uploads.map(row => (
          <div
            key={row.uploadId}
            css={sharedDriveUploadStatusPopupRowStyles}
            data-testid="shared-drive-upload-status-row"
            data-uie-name="shared-drive-upload-status-row"
          >
            <div css={sharedDriveUploadStatusPopupRowLeadingStyles}>
              {statusIcon(row)}
              <div css={sharedDriveUploadStatusPopupRowTextStyles}>
                <strong css={sharedDriveUploadStatusPopupRowFileNameStyles} title={row.fileName}>
                  {row.fileName}
                </strong>
                <span css={sharedDriveUploadStatusPopupRowStatusStyles(row.kind)} title={rowStatusLabel(row)}>
                  {rowStatusLabel(row)}
                </span>
              </div>
            </div>
            <div
              css={
                row.kind === 'failed'
                  ? sharedDriveUploadStatusPopupFailedRowActionsStyles
                  : sharedDriveUploadStatusPopupRowActionsStyles
              }
            >
              {row.canRetry && (
                <button
                  type="button"
                  css={sharedDriveUploadStatusPopupRowActionButtonStyles}
                  aria-label={retryLabel}
                  disabled={isActionPending(isRetrying, row.uploadId)}
                  data-uie-name="shared-drive-upload-retry"
                  onClick={() => onRetry(row.uploadId)}
                >
                  <ReloadIcon
                    css={sharedDriveUploadStatusPopupRowActionIconStyles}
                    color="currentColor"
                    aria-hidden="true"
                  />
                </button>
              )}
              {row.canCancel && (
                <button
                  type="button"
                  css={sharedDriveUploadStatusPopupRowCancelStyles}
                  aria-label={cancelLabel}
                  disabled={isActionPending(isCancelling, row.uploadId)}
                  data-uie-name="shared-drive-upload-cancel"
                  onClick={() => onCancelUpload(row.uploadId)}
                >
                  <CloseIcon color="currentColor" aria-hidden="true" />
                </button>
              )}
              {row.kind === 'failed' && (
                <button
                  type="button"
                  css={sharedDriveUploadStatusPopupRowCancelStyles}
                  aria-label={dismissAriaLabel}
                  data-uie-name="shared-drive-upload-dismiss"
                  onClick={() => onDismissRow?.(row.uploadId)}
                >
                  <CloseIcon color="currentColor" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {!isExpanded && aggregateKind !== 'queued' && renderProgress(upload, false)}
    </div>
  );
};
