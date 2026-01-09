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

export const wrapperStyles: CSSObject = {
  paddingTop: '8px',
  width: '100%',
};

export const labelStyles: CSSObject = {
  fontSize: 'var(--font-size-base)',
  fontWeight: 'var(--font-weight-semibold)',
  marginBottom: '8px',
};

export const publicLinkDescriptionStyles: CSSObject = {
  fontSize: 'var(--font-size-small)',
  color: 'var(--gray-70)',
};

export const switchContainerStyles: CSSObject = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '16px',
  marginBottom: '16px',
};

export const switchWrapperStyles: CSSObject = {
  flexShrink: 0,
};

export const inputStyles: CSSObject = {
  marginBottom: '0',
};

export const inputWrapperStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '8px',
};

export const loaderWrapperStyles: CSSObject = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '106px',
};
