/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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
import {GroupBase, StylesConfig} from 'react-select';

import {
  baseContainerStyles,
  baseControlStyles,
  baseDropdownIndicatorStyles,
  baseIndicatorSeparatorStyles,
  baseMenuListStyles,
  baseMenuStyles,
  baseOptionStyles,
} from './BaseSelect/BaseSelect.styles';
import {Option} from './Select';
import {isGroup} from './SelectOption/SelectOption';

import {Theme} from '../../Identity/Theme';

interface CustomStylesParams {
  theme: Theme;
  markInvalid?: boolean;
  menuPosition?: 'absolute' | 'relative';
  controlCSS: CSSObject;
  containerCSS: CSSObject;
  menuCSS: CSSObject;
  groupCSS: CSSObject;
  groupHeadingCSS: CSSObject;
}

export const customStyles = ({
  theme,
  markInvalid = false,
  menuPosition = 'absolute',
  controlCSS,
  containerCSS,
  menuCSS,
  groupCSS,
  groupHeadingCSS,
}: CustomStylesParams): StylesConfig<Option, false, GroupBase<Option>> => ({
  indicatorSeparator: baseIndicatorSeparatorStyles,
  indicatorsContainer: provided => provided,
  control: (_provided, {isDisabled, selectProps}) =>
    baseControlStyles({theme, isDisabled, markInvalid, selectProps, controlCSS}),
  dropdownIndicator: (provided, selectProps) => ({
    ...provided,
    ...baseDropdownIndicatorStyles({theme, selectProps}),
  }),
  container: (_, {options}) =>
    isGroup(options)
      ? {
          '& > div': {
            display: 'inline',
            position: 'relative',
            top: '-10px',
            ...containerCSS,
          },
        }
      : baseContainerStyles(containerCSS),
  menu: (provided, {options}) => ({
    ...provided,
    ...baseMenuStyles({theme, menuPosition}),
    ...(isGroup(options) && {
      minWidth: '400px',
    }),
    ...menuCSS,
  }),
  menuList: provided => ({
    ...provided,
    ...baseMenuListStyles(),
  }),
  option: (provided, {isMulti, isDisabled, isFocused, isSelected, options, data}) => ({
    ...provided,
    ...baseOptionStyles({theme, isMulti, isDisabled, isFocused, isSelected}),
    padding: isGroup(options) ? '6px 16px' : '10px 18px',
    fontWeight: isSelected && isGroup(options) ? 600 : 400,
    ...(isGroup(options) && {
      'div > svg': {
        fill: theme.general.contrastColor,
      },
    }),
    ...(!isGroup(options) && {
      '&:not(:last-of-type)': {
        borderBottom: `1px solid ${theme.Select.borderColor}`,
      },
    }),
    ...(!isGroup(options) && {
      '&:first-of-type': {
        borderRadius: '0',
      },
    }),
    ...(isGroup(options) && {
      textAlign: 'left',
    }),
    '&:last-of-type': {
      ...(!isGroup(options) && {borderRadius: '0'}),
      ...(isGroup(options) &&
        !options[options.length - 1].options.includes(data) && {
          borderBottom: `1px solid ${theme.Select.borderColor}`,
        }),
    },
  }),
  valueContainer: provided => ({
    ...provided,
    padding: 0,
    width: '100%',
    display: 'grid',
  }),
  groupHeading: base => ({
    ...base,
    color: theme.general.color,
    fontSize: theme.fontSizes.small,
    lineHeight: 1,
    padding: '8px 16px 6px',
    textAlign: 'left',
    ...groupHeadingCSS,
  }),
  group: provided => ({
    ...provided,
    backgroundColor: theme.Input.backgroundColor,
    ...groupCSS,
  }),
});
