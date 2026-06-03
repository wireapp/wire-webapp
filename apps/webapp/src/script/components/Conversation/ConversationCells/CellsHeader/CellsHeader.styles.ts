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
  display: 'flex',
  alignItems: 'flex-start',
  flexDirection: 'column',
  gap: '16px',
  marginBottom: '20px',
  padding: '0 16px',
  width: '100%',
};

export const contentStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  width: '100%',
  minHeight: '32px',
};

export const breadcrumbsRowStyles: CSSObject = {
  display: 'flex',
  width: '100%',
  height: '24px',
  alignItems: 'center',
  gap: '10px',
};

export const rootHomeIconStyles: CSSObject = {
  width: '14px',
  height: '14px',
  flexShrink: 0,
};

export const actionsStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginLeft: 'auto',
};

export const searchWrapperStyles: CSSObject = {
  flex: '0 1 328px',
  minWidth: '160px',
};
