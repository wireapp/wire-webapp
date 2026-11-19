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

import {fileHeaderHeight} from '../../../../../FileFullscreenModal/common/fileHeaderHeight';

export const contentStyles: CSSObject = {
  display: 'flex',
  width: '100%',
  height: '100%',
  flexDirection: 'column',
  alignItems: 'center',
};

export const headerStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
  height: fileHeaderHeight,
  width: '100%',
  boxSizing: 'border-box',
  padding: '0 16px',
  borderBottom: '1px solid var(--border-color)',
  backgroundColor: 'var(--app-bg)',
};

export const nameStyles: CSSObject = {
  overflow: 'hidden',
  margin: 0,
  color: 'var(--foreground)',
  fontSize: 'var(--font-size-medium)',
  fontWeight: 'var(--font-weight-semibold)',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const actionsStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexShrink: 0,
};

export const actionButtonStyles: CSSObject = {
  display: 'flex',
  width: '40px',
  minWidth: '40px',
  height: '40px',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  borderRadius: '50%',
  padding: 0,
  color: 'var(--foreground)',
  fill: 'currentColor',
  background: 'none',
  cursor: 'pointer',
};

export const readerStyles: CSSObject = {
  display: 'flex',
  width: '100%',
  height: `calc(100% - ${fileHeaderHeight}px)`,
  minHeight: 0,
  flex: 1,
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'var(--app-bg)',
};

export const loadingStyles: CSSObject = {
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  color: 'var(--foreground)',
};
