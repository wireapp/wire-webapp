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

export const sharedDriveUploadStatusPopupStyles: CSSObject = {
  position: 'absolute',
  right: 16,
  bottom: 16,
  zIndex: 'var(--z-index-panel)',
  display: 'flex',
  width: 'min(412px, calc(100% - 32px))',
  minHeight: 52,
  boxSizing: 'border-box',
  flexDirection: 'column',
  gap: 16,
  overflow: 'hidden',
  padding: '8px 16px',
  borderRadius: 12,
  backgroundColor: 'var(--app-bg, #fff)',
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
  color: '#676b71',
  fontSize: 12,
  lineHeight: '14px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const sharedDriveUploadStatusPopupIconStyles: CSSObject = {
  flex: '0 0 auto',
  width: 16,
  height: 16,
};

export const sharedDriveUploadStatusPopupProgressStyles: CSSObject = {
  position: 'absolute',
  bottom: 0,
  left: 3,
  width: '50%',
  height: 3,
  overflow: 'hidden',
  backgroundColor: '#0667c8',
  animation: 'shared-drive-upload-progress 1.5s ease-in-out infinite',
  '@keyframes shared-drive-upload-progress': {
    '0%': {transform: 'translateX(-100%)'},
    '100%': {transform: 'translateX(200%)'},
  },
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
  },
};
