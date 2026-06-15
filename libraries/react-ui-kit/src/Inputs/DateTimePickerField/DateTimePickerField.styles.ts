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

import {BASE_DARK_COLOR, BASE_LIGHT_COLOR} from '../../Identity';

export const dateTimePickerContentStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  width: '100%',
};

export const dateTimePickerFieldsRowStyles: CSSObject = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 160px)',
  gap: '12px',
  width: '100%',
  '@media (max-width: 520px)': {
    gridTemplateColumns: 'minmax(0, 1fr)',
  },
};

export const dateTimePickerFieldWrapperStyles: CSSObject = {
  marginBottom: 0,
};

export const dateTimePickerErrorTextStyles: CSSObject = {
  fontSize: 'var(--font-size-small)',
  color: BASE_LIGHT_COLOR.RED,
  'body.theme-dark &': {
    color: BASE_DARK_COLOR.RED,
  },
};
