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

import {CSSObject} from '@emotion/react';

export const selectionBarAnchorStyles: CSSObject = {
  position: 'relative',
  width: '100%',
  height: '32px',
};

export const selectionBarBreadcrumbAnchorStyles: CSSObject = {
  position: 'absolute',
  zIndex: 1,
  top: 0,
  right: 0,
  left: 0,
  height: '32px',
};

export const selectionBarStyles: CSSObject = {
  position: 'absolute',
  zIndex: 1,
  inset: 0,
  display: 'flex',
  width: '100%',
  alignItems: 'center',
  gap: '8px',
  minHeight: '32px',
  padding: '0 8px',
  borderRadius: '8px',
  background: 'linear-gradient(var(--accent-color-fade-16), var(--accent-color-fade-16)), var(--modal-bg)',
  color: 'var(--main-color)',
};

export const selectionCountStyles: CSSObject = {
  minWidth: 0,
  overflow: 'hidden',
  fontWeight: 'var(--font-weight-semibold)',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const clearButtonStyles: CSSObject = {
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  padding: 0,
  border: 0,
  borderRadius: '50%',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',

  '&:hover, &:focus-visible': {
    backgroundColor: 'var(--foreground-fade-8)',
  },
};
