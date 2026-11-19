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

export const callHeaderTitleRootStyles: CSSObject = {
  position: 'relative',
  maxWidth: '100%',
};

export const callHeaderTitleButtonStyles: CSSObject = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  maxWidth: '100%',
  border: 0,
  padding: 0,
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  font: 'inherit',
  '&:focus-visible': {outline: '2px solid var(--accent-color)', outlineOffset: 2},
};

export const callHeaderPopoverStyles: CSSObject = {
  position: 'absolute',
  zIndex: 20,
  top: 'calc(100% + 8px)',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 'min(420px, calc(100vw - 16px))',
  padding: 16,
  border: '1px solid var(--foreground-fade-16)',
  borderRadius: 12,
  backgroundColor: 'var(--dropdown-menu-bg)',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.14)',
  color: 'var(--main-color)',
  fontSize: 14,
  fontWeight: 400,
  lineHeight: '20px',
  textAlign: 'left',
  whiteSpace: 'normal',
  '& p': {marginBottom: 0},
};

export const callHeaderPopoverHeaderStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
};

export const callHeaderPopoverCloseStyles: CSSObject = {
  display: 'inline-flex',
  width: 24,
  height: 24,
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  border: 0,
  borderRadius: 6,
  padding: 0,
  background: 'transparent',
  cursor: 'pointer',
  '&:focus-visible': {outline: '2px solid var(--accent-color)'},
};

export const callHeaderPopoverFooterStyles: CSSObject = {
  display: 'flex',
  justifyContent: 'flex-end',
  marginTop: 20,
};
