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

export const modalWrapperStyles: CSSObject = {
  overflow: 'unset',
  overflowY: 'unset',
  maxWidth: '760px',
  width: '-webkit-fill-available',
  margin: '1rem',
};

export const wrapperStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
};

export const headerStyles: CSSObject = {
  display: 'grid',
  gridTemplateColumns: '40px 1fr 40px',
  alignItems: 'center',
  height: '64px',
  padding: '0 16px',
  borderBottom: '1px solid var(--border-color)',
};

export const headerTitleStyles: CSSObject = {
  margin: 0,
  fontSize: 'var(--font-size-large)',
  fontWeight: 'var(--font-weight-semibold)',
  textAlign: 'center',
};

export const closeButtonStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: 'var(--text-color)',
};

export const bodyStyles: CSSObject = {
  padding: '24px',
  minHeight: '320px',
  overflow: 'visible',
};

export const footerStyles: CSSObject = {
  display: 'flex',
  justifyContent: 'flex-end',
  padding: '16px 24px 24px',
  position: 'relative',
  zIndex: 'auto',
};

export const submitButtonStyles: CSSObject = {
  marginBottom: 0,
};

export const submitButtonIconStyles: CSSObject = {
  marginRight: '8px',
};
