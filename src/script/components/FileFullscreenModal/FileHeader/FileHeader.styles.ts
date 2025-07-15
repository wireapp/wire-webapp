/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {fileHeaderHeight} from '../common/fileHeaderHeight';

export const headerStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: fileHeaderHeight,
  width: '100%',
  lineHeight: 'var(--line-height-sm)',
  borderBottom: '1px solid var(--border-color)',
  backgroundColor: 'var(--app-bg)',
};

export const closeButtonStyles: CSSObject = {
  cursor: 'pointer',
  fill: 'currentColor',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  border: 'none',
  background: 'none',
  padding: 0,
  marginRight: '40px',
};

export const leftColumnStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
};

export const metadataStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  fontSize: 'var(--font-size-small)',
};

export const nameStyles: CSSObject = {
  fontSize: 'var(--font-size-medium)',
  fontWeight: 'var(--font-weight-semibold)',
};

export const textStyles: CSSObject = {
  fontSize: 'var(--font-size-small)',
  color: 'var(--gray-70)',

  'body.theme-dark &': {
    color: 'var(--gray-40)',
  },
};

export const infoWrapperStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
};

export const loaderIconStyles: CSSObject = {
  color: 'var(--gray-70)',
  fontSize: 'var(--font-size-medium)',

  'body.theme-dark &': {
    color: 'var(--gray-40)',
  },
};

export const actionButtonsStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginRight: '8px',
};

export const downloadButtonStyles: CSSObject = {
  marginBottom: '0',
  flexShrink: '0',
  width: '40px',
  height: '32px',
};
