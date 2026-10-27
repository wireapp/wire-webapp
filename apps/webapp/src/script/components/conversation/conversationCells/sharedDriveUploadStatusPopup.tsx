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

import type {ReactNode, FunctionComponent} from 'react';

import {isNonEmptyString} from '@sindresorhus/is';

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
import type {SharedDriveMoveStatus} from './sharedDriveUploadStatusContext';
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

const getProgressTransform = (progress: number): string => {
  return `scaleX(${Math.min(1, Math.max(0, progress))})`;
};

interface SharedDriveMoveActivityProps {
  readonly move: SharedDriveMoveStatus;
  readonly title: string;
  readonly statusLabel: string;
  readonly destination: string;
  readonly isExpanded: boolean;
  readonly toggleLabel: string;
  readonly dismissLabel: string;
  readonly onToggle: () => void;
  readonly onDismiss: () => void;
}

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

const isActionPending = (state: UploadActionState, uploadId: string): boolean => {
  return typeof state === 'function' ? state(uploadId) : state;
};

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
    const fileExtension = getFileExtension(upload.fileName);

    return (
      <div
        css={sharedDriveUploadStatusPopupRowIconStyles}
        aria-hidden="true"
        data-uie-name="shared-drive-upload-uploaded"
      >
        <FileTypeIcon extension={isNonEmptyString(fileExtension) ? fileExtension : 'pdf'} size={24} />
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

interface SharedDriveStatusRowLeadingProps {
  readonly icon: ReactNode;
  readonly name: string;
  readonly status: string;
  readonly kind: SharedDriveUploadStatusKind;
}

const SharedDriveStatusRowLeading: FunctionComponent<SharedDriveStatusRowLeadingProps> = ({
  icon,
  name,
  status,
  kind,
}) => {
  return (
    <div css={sharedDriveUploadStatusPopupRowLeadingStyles}>
      {icon}
      <div css={sharedDriveUploadStatusPopupRowTextStyles}>
        <strong css={sharedDriveUploadStatusPopupRowFileNameStyles} title={name}>
          {name}
        </strong>
        <span css={sharedDriveUploadStatusPopupRowStatusStyles(kind)} title={status}>
          {status}
        </span>
      </div>
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
        data-uie-name="shared-drive-upload-progress"
      />
    );
  }

  if (upload.kind !== 'queued') {
    const isUploaded = upload.kind === 'uploaded';
    return (
      <div
        role={isUploaded ? 'progressbar' : undefined}
        aria-label={isUploaded ? upload.fileName : undefined}
        aria-valuemin={isUploaded ? 0 : undefined}
        aria-valuemax={isUploaded ? PROGRESS_PERCENTAGE_MAX : undefined}
        aria-valuenow={isUploaded ? PROGRESS_PERCENTAGE_MAX : undefined}
        aria-hidden={isUploaded ? undefined : true}
        css={sharedDriveUploadStatusPopupProgressStyles(isExpanded, upload.kind)}
        data-uie-name="shared-drive-upload-progress"
      />
    );
  }

  return null;
};

const SharedDriveUploadStatusPopupContent: FunctionComponent<SharedDriveUploadStatusPopupProps> = ({
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
  const rowStatusLabel = (row: SharedDriveUploadStatus): string => {
    return statusLabels?.get(row.uploadId) ?? statusLabel;
  };

  return (
    <div css={sharedDriveUploadStatusPopupStyles} data-uie-name="shared-drive-upload-status-popup">
      <div
        role="group"
        aria-labelledby="shared-drive-upload-status-title"
        css={sharedDriveUploadStatusPopupContentStyles}
        data-uie-name="shared-drive-upload-status-header"
      >
        <div
          className="shared-drive-upload-status-popup__header-text"
          css={sharedDriveUploadStatusPopupTextStyles}
          role="status"
          aria-live="polite"
        >
          <strong id="shared-drive-upload-status-title" css={sharedDriveUploadStatusPopupTitleStyles} title={title}>
            {title}
          </strong>
          <span css={sharedDriveUploadStatusPopupDestinationStyles} title={destination}>
            {destination}
          </span>
        </div>
        <div css={sharedDriveUploadStatusPopupHeaderActionsStyles}>
          {uploads.some(row => {
            return row.cancellableUploadIds.length > 0;
          }) && (
            <button
              type="button"
              css={sharedDriveUploadStatusPopupHeaderCancelStyles}
              disabled={uploads.some(row => {
                return isActionPending(isCancelling, row.uploadId);
              })}
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
        role="list"
        aria-labelledby="shared-drive-upload-status-title"
        css={sharedDriveUploadStatusPopupRowsStyles}
        data-uie-name="shared-drive-upload-status-rows"
        hidden={!isExpanded}
      >
        {uploads.map(row => {
          return (
            <div
              key={row.uploadId}
              css={sharedDriveUploadStatusPopupRowStyles}
              role="listitem"
              data-uie-name="shared-drive-upload-status-row"
            >
              <SharedDriveStatusRowLeading
                icon={statusIcon(row)}
                name={row.fileName}
                status={rowStatusLabel(row)}
                kind={row.kind}
              />
              <div
                css={
                  row.kind === 'failed'
                    ? sharedDriveUploadStatusPopupFailedRowActionsStyles
                    : sharedDriveUploadStatusPopupRowActionsStyles
                }
              >
                {row.retryableUploads.length > 0 && (
                  <button
                    type="button"
                    css={sharedDriveUploadStatusPopupRowActionButtonStyles}
                    aria-label={retryLabel}
                    disabled={isActionPending(isRetrying, row.uploadId)}
                    data-uie-name="shared-drive-upload-retry"
                    onClick={() => {
                      return onRetry(row.uploadId);
                    }}
                  >
                    <ReloadIcon
                      css={sharedDriveUploadStatusPopupRowActionIconStyles}
                      color="currentColor"
                      aria-hidden="true"
                    />
                  </button>
                )}
                {row.cancellableUploadIds.length > 0 && (
                  <button
                    type="button"
                    css={sharedDriveUploadStatusPopupRowCancelStyles}
                    aria-label={cancelLabel}
                    disabled={isActionPending(isCancelling, row.uploadId)}
                    data-uie-name="shared-drive-upload-cancel"
                    onClick={() => {
                      return onCancelUpload(row.uploadId);
                    }}
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
                    onClick={() => {
                      return onDismissRow?.(row.uploadId);
                    }}
                  >
                    <CloseIcon color="currentColor" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {!isExpanded && aggregateKind !== 'queued' && renderProgress(upload, false)}
    </div>
  );
};

const moveItemIcon = (item: SharedDriveMoveStatus['items'][number]): ReactNode => {
  if (item.isFolder) {
    return <FolderIcon css={sharedDriveUploadStatusPopupRowIconStyles} aria-hidden="true" />;
  }

  const fileExtension = getFileExtension(item.name);
  return (
    <div css={sharedDriveUploadStatusPopupRowIconStyles} aria-hidden="true">
      <FileTypeIcon extension={isNonEmptyString(fileExtension) ? fileExtension : 'pdf'} size={24} />
    </div>
  );
};

export const SharedDriveUploadStatusPopup: FunctionComponent<
  SharedDriveUploadStatusPopupProps | SharedDriveMoveActivityProps
> = props => {
  if ('move' in props) {
    const {move, title, statusLabel, destination, isExpanded, toggleLabel, dismissLabel, onToggle, onDismiss} = props;
    const rowStatusKind = move.kind === 'processing' ? 'uploading' : 'uploaded';
    const rowsId = 'shared-drive-move-status-rows';

    return (
      <div css={sharedDriveUploadStatusPopupStyles} data-uie-name="shared-drive-upload-status-popup">
        <div
          role="group"
          aria-labelledby="shared-drive-move-status-title"
          css={sharedDriveUploadStatusPopupContentStyles}
          data-uie-name="shared-drive-upload-status-header"
        >
          <div css={sharedDriveUploadStatusPopupTextStyles} role="status" aria-live="polite">
            <strong id="shared-drive-move-status-title" css={sharedDriveUploadStatusPopupTitleStyles} title={title}>
              {title}
            </strong>
            <span css={sharedDriveUploadStatusPopupDestinationStyles} title={destination}>
              {destination}
            </span>
          </div>
          <div css={sharedDriveUploadStatusPopupHeaderActionsStyles}>
            <button
              type="button"
              css={sharedDriveUploadStatusPopupHeaderCancelStyles}
              aria-label={dismissLabel}
              onClick={onDismiss}
            >
              {dismissLabel}
            </button>
            <button
              type="button"
              css={sharedDriveUploadStatusPopupToggleStyles}
              aria-label={toggleLabel}
              aria-expanded={isExpanded}
              aria-controls={rowsId}
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
        {move.kind === 'processing' ? (
          <div
            role="progressbar"
            aria-label={statusLabel}
            css={sharedDriveUploadStatusPopupProgressStyles(isExpanded)}
            data-uie-name="shared-drive-move-progress"
          />
        ) : (
          <div
            role="progressbar"
            aria-label={statusLabel}
            aria-valuemin={0}
            aria-valuemax={PROGRESS_PERCENTAGE_MAX}
            aria-valuenow={PROGRESS_PERCENTAGE_MAX}
            css={sharedDriveUploadStatusPopupProgressStyles(isExpanded, 'uploaded')}
            data-uie-name="shared-drive-move-progress"
          />
        )}
        <div
          id={rowsId}
          role="list"
          aria-labelledby="shared-drive-move-status-title"
          css={sharedDriveUploadStatusPopupRowsStyles}
          hidden={!isExpanded}
        >
          {move.items.map(item => {
            return (
              <div key={item.id} css={sharedDriveUploadStatusPopupRowStyles} role="listitem">
                <SharedDriveStatusRowLeading
                  icon={moveItemIcon(item)}
                  name={item.name}
                  status={statusLabel}
                  kind={rowStatusKind}
                />
                <div css={sharedDriveUploadStatusPopupRowActionsStyles} aria-hidden="true" />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return <SharedDriveUploadStatusPopupContent {...props} />;
};
