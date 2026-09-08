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

export const dropzoneStyles: CSSObject = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
};

export const overlayStyles: CSSObject = {
  position: 'absolute',
  inset: 0,
  zIndex: 1,
  display: 'none',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px dashed var(--accent-color)',
  borderRadius: '8px',
  background: 'var(--accent-color-fade-16)',
  pointerEvents: 'none',
};

export const overlayActiveStyles: CSSObject = {
  ...overlayStyles,
  display: 'flex',
};

export const contentStyles: CSSObject = {
  display: 'inline-flex',
  padding: '16px 24px',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '16px',
  borderRadius: '24px',
  background: 'var(--accent-color-50)',

  'body.theme-dark &': {
    background: 'var(--accent-color-800)',
  },
};

export const iconWrapperStyles: CSSObject = {
  display: 'flex',
  width: '48px',
  height: '48px',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '24px',
  background: 'var(--accent-color-100)',

  'body.theme-dark &': {
    background: 'var(--accent-color-700)',
  },
};

export const textWrapperStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
};

export const titleStyles: CSSObject = {
  margin: 0,
  color: 'var(--main-color)',
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: '20px',
  textAlign: 'center',
};

export const descriptionStyles: CSSObject = {
  margin: 0,
  color: 'var(--main-color)',
  fontSize: '12px',
  fontWeight: 400,
  lineHeight: '16px',
  textAlign: 'center',
};
