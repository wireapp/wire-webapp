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

export const overlayStyles: CSSObject = {
  position: 'relative',
  display: 'flex',
  width: '100%',
  height: '100%',
  minHeight: 0,
  flexDirection: 'column',
  backgroundColor: 'var(--app-bg)',
  color: 'var(--foreground)',
};

export const closeButtonStyles: CSSObject = {
  position: 'fixed',
  zIndex: 1,
  top: '16px',
  right: '16px',
  display: 'flex',
  width: '40px',
  minWidth: '40px',
  height: '40px',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid var(--border-color)',
  borderRadius: '50%',
  padding: 0,
  color: 'var(--foreground)',
  backgroundColor: 'var(--app-bg)',
  cursor: 'pointer',
};

export const previewScrollStyles: CSSObject = {
  boxSizing: 'border-box',
  display: 'flex',
  width: '100%',
  minHeight: 0,
  flex: 1,
  alignItems: 'flex-start',
  justifyContent: 'center',
  overflow: 'auto',
  padding: '72px 0 16px',
};

export const previewImageStyles: CSSObject = {
  display: 'block',
  width: '100%',
  maxWidth: '1200px',
  height: 'auto',
  margin: '0 auto',
};

export const previewStatusStyles: CSSObject = {
  margin: 'auto',
  color: 'var(--foreground)',
};
