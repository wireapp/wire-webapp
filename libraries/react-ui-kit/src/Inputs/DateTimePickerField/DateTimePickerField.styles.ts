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

import {Theme} from '../../Identity/Theme';

export const dateTimePickerContentStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  width: '100%',
};

export const dateTimePickerFieldsRowStyles: CSSObject = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 140px)',
  gap: '12px',
  width: '100%',
  alignItems: 'stretch',
  '@media (max-width: 520px)': {
    gridTemplateColumns: 'minmax(0, 1fr)',
  },
};

export const dateTimePickerDateFieldWrapperStyles: CSSObject = {
  marginBottom: 0,
  width: '100%',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'stretch',
  '.react-aria-DatePicker': {
    width: '100%',
    minWidth: 0,
    flex: 1,
  },
  '.react-aria-Group': {
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    flex: 1,
    boxSizing: 'border-box',
  },
};

export const dateTimePickerTimeFieldWrapperStyles: CSSObject = {
  marginBottom: 0,
  width: '100%',
  minWidth: 0,
  '& > div[data-uie-name]': {
    marginBottom: 0,
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
  },
};

export const dateTimePickerErrorTextStyles = (theme: Theme): CSSObject => ({
  fontSize: theme.fontSizes.small,
  color: theme.general.dangerColor,
});
