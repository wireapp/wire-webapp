/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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
import {StylesConfig} from 'react-select';

import {Theme} from '../../../Layout';
import {
  baseContainerStyles,
  baseControlStyles,
  baseDropdownIndicatorStyles,
  baseIndicatorSeparatorStyles,
  baseMenuListStyles,
  baseMenuStyles,
  baseOptionStyles,
  baseSingleValueStyles,
} from '../BaseSelect/BaseSelect.styles';

interface CustomStylesParams {
  theme: Theme;
  markInvalid?: boolean;
  menuPosition?: 'absolute' | 'relative';
  controlCSS?: CSSObject;
  containerCSS?: CSSObject;
}

export const customStyles = ({
  theme,
  markInvalid = false,
  controlCSS = {},
  containerCSS = {},
}: CustomStylesParams): StylesConfig => ({
  indicatorSeparator: () => baseIndicatorSeparatorStyles(),
  indicatorsContainer: provided => provided,
  container: provided => ({
    ...provided,
    ...baseContainerStyles(containerCSS),
  }),
  control: (_, {isDisabled, selectProps}) =>
    baseControlStyles({theme, isDisabled, markInvalid, selectProps, controlCSS}),
  dropdownIndicator: (provided, selectProps) => ({
    ...provided,
    ...baseDropdownIndicatorStyles({theme, selectProps}),
  }),
  menuList: provided => ({
    ...provided,
    ...baseMenuListStyles(),
  }),
  option: (provided, {isDisabled, isFocused, isSelected, isMulti}) => ({
    ...provided,
    ...baseOptionStyles({theme, isDisabled, isFocused, isSelected, isMulti}),
    padding: '10px 18px',
    fontWeight: 400,
    '&:not(:last-of-type)': {
      borderBottom: `1px solid ${theme.Select.borderColor}`,
    },
    '&:first-of-type': {
      borderRadius: '0',
    },
    '&:last-of-type': {
      borderRadius: '0',
    },
  }),
  singleValue: (provided, selectProps) => ({
    ...provided,
    ...baseSingleValueStyles({theme, selectProps}),
  }),
  menu: provided => ({
    ...provided,
    ...baseMenuStyles({theme, menuPosition: 'absolute'}),
    width: '100%',
    zIndex: 1,
  }),
  multiValue: provided => ({
    ...provided,
    backgroundColor: theme.Select.optionHoverBg,
    borderRadius: 8,
    margin: 4,
    fontSize: '14px',
    height: '24px',
  }),
  multiValueLabel: provided => ({
    ...provided,
    color: theme.general.primaryColor,
    fontWeight: 500,
    padding: '0 8px 0 0',
  }),
  multiValueRemove: provided => ({
    ...provided,
    color: theme.general.primaryColor,
    ':hover': {
      backgroundColor: 'transparent',
      color: theme.general.primaryColor,
    },
  }),
  valueContainer: provided => ({
    ...provided,
    padding: 0,
    width: '100%',
    display: 'flex',
    flexWrap: 'wrap',
    maxHeight: '72px',
    overflowY: 'auto',
  }),
});
