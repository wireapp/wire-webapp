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

export const modalStyles: CSSObject = {
  width: '508px',
};

export const wrapperStyles: CSSObject = {
  padding: '8px',
  width: '100%',
  position: 'relative',
};
export const headerStyles: CSSObject = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexDirection: 'column',
  marginTop: '16px',
  marginBottom: '24px',
};

export const headingStyles: CSSObject = {
  fontSize: 'var(--font-size-large)',
  fontWeight: 'var(--font-weight-semibold)',
  margin: '0',
};

export const closeButtonStyles: CSSObject = {
  position: 'absolute',
  right: '8px',
  top: '8px',
};

export const inputWrapperStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  padding: '16px',
  gap: '8px',
};

export const buttonWrapperStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  flexDirection: 'row',
  gap: '8px',
  padding: '0 16px',
  marginBottom: '8px',
};

export const buttonStyles: CSSObject = {
  width: '100%',
  margin: '0',
};

export const breadcrumbsWrapperStyles: CSSObject = {
  padding: '0 16px',
  marginBottom: '24px',
};

export const listWrapperStyles: CSSObject = {
  padding: '0 16px',
  marginBottom: '16px',
};

export const createNewWrapperStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  width: '100%',
  padding: '0 16px',
  marginBottom: '24px',
};

export const createNewTextStyles: CSSObject = {
  fontSize: 'var(--font-size-medium)',
};

export const createNewButtonStyles: CSSObject = {
  height: '32px',
  margin: '0',
};

export const createNewIconStyles: CSSObject = {
  marginRight: '8px',
};
