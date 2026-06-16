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

export const dateTimePickerTimeFieldWidth = '132px';

export const dateTimePickerFieldsRowStyles: CSSObject = {
  display: 'flex',
  alignItems: 'stretch',
  gap: '12px',
  width: '100%',
  '@media (max-width: 520px)': {
    flexDirection: 'column',
  },
};

export const dateTimePickerDateFieldWrapperStyles: CSSObject = {
  flex: '1 1 0',
  marginBottom: 0,
  minWidth: 0,
  width: 'auto',
  '.react-aria-DatePicker': {
    width: '100%',
    minWidth: 0,
  },
  '.react-aria-Group': {
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    height: '48px',
    boxSizing: 'border-box',
  },
};

export const dateTimePickerTimeFieldWrapperStyles: CSSObject = {
  flex: `0 0 ${dateTimePickerTimeFieldWidth}`,
  marginBottom: 0,
  maxWidth: dateTimePickerTimeFieldWidth,
  minWidth: dateTimePickerTimeFieldWidth,
  position: 'relative',
  width: dateTimePickerTimeFieldWidth,
  '@media (max-width: 520px)': {
    flex: '1 1 auto',
    maxWidth: 'none',
    minWidth: 0,
    width: '100%',
  },
};

export const dateTimePickerErrorTextStyles = (theme: Theme): CSSObject => ({
  fontSize: theme.fontSizes.small,
  color: theme.general.dangerColor,
});
