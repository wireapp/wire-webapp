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

export const emptyListStyles: CSSObject = {
  maxWidth: '550px',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

export const emptyListHeadingStyles: CSSObject = {
  color: 'var(--main-color)',
  fontWeight: 'var(--font-weight-semibold)',
  fontSize: 'var(--font-size-base)',
  lineHeight: 'var(--line-height-md)',
  letterSpacing: '0.05px',
  margin: '0 0 10px',
};

export const emptyListBodyStyles: CSSObject = {
  color: 'var(--main-color)',
  fontWeight: 'var(--font-weight-regular)',
  fontSize: 'var(--font-size-base)',
  lineHeight: 'var(--line-height-md)',
  letterSpacing: '0.05px',
  margin: '0 0 30px',
};

export const emptyListActionButtonsStyles: CSSObject = {
  marginRight: '12px',
};

export const emptyListActionButtonContainerStyles: CSSObject = {
  display: 'flex',
  gap: '8px',
  justifyContent: 'center',
};

export const emptyTabsListContainerStyles: CSSObject = {
  display: 'grid',
  placeItems: 'center',
  padding: '24px',
};

export const emptyListContainerStyles: CSSObject = {
  ...emptyTabsListContainerStyles,
  height: '100%',
  minHeight: '60vh',
};
