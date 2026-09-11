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

import type {CSSObject} from '@emotion/react';

import type {SharedDriveUploadStatusKind} from './sharedDriveUploadStatus';

const SHARED_DRIVE_UPLOAD_PROGRESS_EXPANDED_TOP = 51;
const SHARED_DRIVE_UPLOAD_PROGRESS_COLLAPSED_LEFT = 3;
const PROGRESS_PERCENTAGE_MAX = 100;

export const sharedDriveUploadStatusPopupStyles: CSSObject = {
  position: 'absolute',
  right: 12,
  bottom: 12,
  zIndex: 'var(--z-index-panel)',
  display: 'flex',
  width: 'min(412px, calc(100% - 24px))',
  minHeight: 52,
  boxSizing: 'border-box',
  flexDirection: 'column',
  gap: 16,
  overflow: 'hidden',
  padding: '8px 16px',
  borderRadius: 12,
  backgroundColor: 'var(--dropdown-menu-bg, #fff)',
  boxShadow: '0 0 12px 0 rgb(0 0 0 / 25%)',
};

export const sharedDriveUploadStatusPopupContentStyles: CSSObject = {
  display: 'flex',
  minWidth: 0,
  minHeight: 36,
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
};

export const sharedDriveUploadStatusPopupTextStyles: CSSObject = {
  display: 'flex',
  minWidth: 0,
  flexDirection: 'column',
  gap: 2,
};

export const sharedDriveUploadStatusPopupTitleStyles: CSSObject = {
  overflow: 'hidden',
  fontSize: 14,
  fontWeight: 600,
  lineHeight: '20px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const sharedDriveUploadStatusPopupDestinationStyles: CSSObject = {
  overflow: 'hidden',
  color: 'var(--text-input-placeholder, #676b71)',
  fontSize: 12,
  lineHeight: '14px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const sharedDriveUploadStatusPopupHeaderActionsStyles: CSSObject = {
  display: 'flex',
  flex: '0 0 auto',
  alignItems: 'center',
  gap: 8,
};

export const sharedDriveUploadStatusPopupHeaderCancelStyles: CSSObject = {
  minWidth: 74,
  height: 32,
  padding: '4px 12px',
  border: '1px solid var(--button-tertiary-border, #dce0e3)',
  borderRadius: 12,
  background: 'var(--button-tertiary-bg, #fff)',
  color: 'inherit',
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: '0.35px',
  lineHeight: '22px',
  cursor: 'pointer',
  '&:disabled': {
    cursor: 'default',
    opacity: 0.5,
  },
};

export const sharedDriveUploadStatusPopupToggleStyles: CSSObject = {
  display: 'flex',
  width: 24,
  height: 32,
  flex: '0 0 auto',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: 0,
  borderRadius: 12,
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
};

export const sharedDriveUploadStatusPopupToggleIconStyles: CSSObject = {
  width: 16,
  height: 16,
};

export const sharedDriveUploadStatusPopupRowStyles: CSSObject = {
  display: 'flex',
  minWidth: 0,
  minHeight: 38,
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '4px 0',
  '&[hidden]': {
    display: 'none',
  },
};

export const sharedDriveUploadStatusPopupRowLeadingStyles: CSSObject = {
  display: 'flex',
  minWidth: 0,
  flex: '0 1 242px',
  alignItems: 'center',
  gap: 16,
};

export const sharedDriveUploadStatusPopupRowTextStyles: CSSObject = {
  display: 'flex',
  minWidth: 0,
  flex: 1,
  flexDirection: 'column',
  gap: 2,
};

export const sharedDriveUploadStatusPopupRowActionsStyles: CSSObject = {
  display: 'flex',
  width: 87,
  flex: '0 0 87px',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 16,
};

export const sharedDriveUploadStatusPopupRowActionButtonStyles: CSSObject = {
  display: 'flex',
  width: 14,
  height: 24,
  flex: '0 0 14px',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: 0,
  borderRadius: 12,
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  '&:disabled': {
    cursor: 'default',
    opacity: 0.5,
  },
};

export const sharedDriveUploadStatusPopupRowCancelStyles: CSSObject = {
  display: 'flex',
  flex: '0 0 auto',
  width: 24,
  height: 24,
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: 0,
  borderRadius: 12,
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  '&:disabled': {
    cursor: 'default',
    opacity: 0.5,
  },
};

export const sharedDriveUploadStatusPopupRowFileNameStyles: CSSObject = {
  overflow: 'hidden',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.25px',
  lineHeight: '14px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const sharedDriveUploadStatusPopupRowStatusStyles = (kind: SharedDriveUploadStatusKind): CSSObject => ({
  overflow: 'hidden',
  color: {
    uploading: 'var(--accent-color, #0667c8)',
    uploaded: 'var(--success-color, #1d7833)',
    failed: 'var(--danger-color, #c20013)',
  }[kind],
  fontSize: 12,
  lineHeight: '14px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const sharedDriveUploadStatusPopupRowIconStyles: CSSObject = {
  width: 24,
  height: 24,
  flex: '0 0 auto',
};

export const sharedDriveUploadStatusPopupUploadSpinnerStyles: CSSObject = {
  transformBox: 'view-box',
  transformOrigin: '12px 12px',
  animation: 'shared-drive-upload-spinner 1s linear infinite',
  '@keyframes shared-drive-upload-spinner': {
    from: {transform: 'rotate(0deg)'},
    to: {transform: 'rotate(360deg)'},
  },
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
  },
};

export const sharedDriveUploadStatusPopupErrorIconStyles: CSSObject = {
  display: 'flex',
  width: 24,
  height: 24,
  flex: '0 0 auto',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  border: '1.5px solid var(--pdf-file-icon-bg, #f9e6e8)',
  borderRadius: '50%',
  color: 'var(--danger-color, #c20013)',
};

export const sharedDriveUploadStatusPopupErrorIconInnerStyles: CSSObject = {
  width: 10.5,
  height: 10.5,
};

export const sharedDriveUploadStatusPopupRowActionIconStyles: CSSObject = {
  width: 14,
  height: 14,
};

const sharedDriveUploadStatusPopupProgressBaseStyles = (isExpanded: boolean): CSSObject => ({
  position: 'absolute',
  top: isExpanded ? SHARED_DRIVE_UPLOAD_PROGRESS_EXPANDED_TOP : undefined,
  bottom: isExpanded ? undefined : 0,
  left: isExpanded ? 0 : SHARED_DRIVE_UPLOAD_PROGRESS_COLLAPSED_LEFT,
  height: 3,
  overflow: 'hidden',
});

export const sharedDriveUploadStatusPopupProgressStyles = (
  isExpanded: boolean,
  kind: SharedDriveUploadStatusKind = 'uploading',
): CSSObject => ({
  ...sharedDriveUploadStatusPopupProgressBaseStyles(isExpanded),
  width: kind === 'uploading' ? 'min(209px, calc(50% + 3px))' : 'calc(100% + 4px)',
  backgroundColor: kind === 'failed' ? 'var(--danger-color, #c20013)' : 'var(--accent-color, #0667c8)',
  animation: kind === 'uploading' ? 'shared-drive-upload-progress 1.5s ease-in-out infinite' : 'none',
  '@keyframes shared-drive-upload-progress': {
    '0%': {transform: 'translateX(-100%)'},
    '100%': {transform: 'translateX(200%)'},
  },
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
  },
});

export const sharedDriveUploadStatusPopupDeterminateProgressStyles = (isExpanded: boolean): CSSObject => ({
  ...sharedDriveUploadStatusPopupProgressBaseStyles(isExpanded),
  width: `${PROGRESS_PERCENTAGE_MAX}%`,
  transformOrigin: 'left center',
  backgroundColor: 'var(--accent-color, #0667c8)',
});
