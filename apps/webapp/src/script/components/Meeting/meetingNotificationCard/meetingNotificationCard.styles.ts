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

export const containerStyles: CSSObject = {
  position: 'relative',
  width: '100%',
  boxSizing: 'border-box',
  padding: 12,
  border: '1px solid var(--border-color)',
  borderRadius: 12,
  backgroundColor: 'var(--app-bg)',
  boxShadow: '0 4px 20px var(--background-fade-16)',
  pointerEvents: 'none',
};

export const titleStyles: CSSObject = {
  fontWeight: 'var(--font-weight-medium)',
};

export const metadataStyles: CSSObject = {
  marginTop: 4,
  color: 'var(--base-secondary-text)',
  fontSize: 'var(--font-size-small)',
};

export const actionsStyles: CSSObject = {
  display: 'flex',
  gap: 8,
  marginTop: 12,
};

export const actionStyles: CSSObject = {
  flex: 1,
  minHeight: 32,
  padding: '6px 12px',
  border: '1px solid var(--border-color)',
  borderRadius: 8,
  backgroundColor: 'transparent',
  color: 'var(--foreground)',
  cursor: 'pointer',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-medium)',
  pointerEvents: 'auto',
};

export const viewActionStyles: CSSObject = {
  ...actionStyles,
  borderColor: 'var(--main-color)',
  backgroundColor: 'var(--main-color)',
  color: 'var(--white)',
};
