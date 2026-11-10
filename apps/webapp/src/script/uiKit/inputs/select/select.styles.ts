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
  baseSingleValueStyles,
} from './baseSelect/baseSelect.styles';
import {Option} from './select';
import {isGroup} from './selectOption/selectOption';

import {Theme} from '../../identity/theme';

const selectedGroupFontWeight = 600;
const optionFontWeight = 400;

interface CustomStylesParams {
  theme: Theme;
  markInvalid?: boolean;
  menuPosition?: 'absolute' | 'relative';
  menuMatchControlWidth?: boolean;
  controlCSS: CSSObject;
  containerCSS: CSSObject;
  menuCSS: CSSObject;
  groupCSS: CSSObject;
  groupHeadingCSS: CSSObject;
  menuPortalCSS: CSSObject;
}

export const customStyles = ({
  theme,
  markInvalid = false,
  menuPosition = 'absolute',
  menuMatchControlWidth = false,
  controlCSS,
  containerCSS,
  menuCSS,
  groupCSS,
  groupHeadingCSS,
  menuPortalCSS,
}: CustomStylesParams): StylesConfig<Option, boolean, GroupBase<Option>> => {
  return {
    indicatorSeparator: baseIndicatorSeparatorStyles,
    indicatorsContainer: provided => {
      return provided;
    },
    control: (_provided, {isDisabled, selectProps}) => {
      return baseControlStyles({theme, isDisabled, markInvalid, selectProps, controlCSS});
    },
    dropdownIndicator: (provided, selectProps) => {
      return {
        ...provided,
        ...baseDropdownIndicatorStyles({theme, selectProps}),
      };
    },
    container: (providedContainerStyles, {options}) => {
      return isGroup(options)
        ? {
            '& > div': {
              display: 'inline',
              position: 'relative',
              top: '-10px',
              ...containerCSS,
            },
          }
        : baseContainerStyles(containerCSS);
    },
    menu: (provided, {options}) => {
      const styles: CSSObject = {
        ...provided,
        width: provided.width,
        minWidth: provided.minWidth,
        ...baseMenuStyles({theme, menuPosition}),
        ...(isGroup(options) && {
          minWidth: '400px',
        }),
        ...menuCSS,
      };

      if (menuMatchControlWidth) {
        styles.minWidth = provided.width;
        styles.maxWidth = provided.width;
      }

      return styles;
    },
    singleValue: (provided, selectProps) => {
      return {
        ...provided,
        ...baseSingleValueStyles({theme, selectProps}),
        ...(menuMatchControlWidth && {
          gridArea: 'unset',
          maxWidth: '100%',
          overflow: 'visible',
          textOverflow: 'clip',
        }),
      };
    },
    input: provided => {
      return {
        ...provided,
        color: theme.general.color,
      };
    },
    placeholder: provided => {
      return {
        ...provided,
        color: theme.Input.placeholderColor,
      };
    },
    menuList: provided => {
      return {
        ...provided,
        ...baseMenuListStyles(),
      };
    },
    option: (provided, {isMulti, isDisabled, isFocused, isSelected, options, data}) => {
      return {
        ...provided,
        ...baseOptionStyles({theme, isMulti, isDisabled, isFocused, isSelected}),
        padding: isGroup(options) ? '6px 16px' : '10px 18px',
        fontWeight: isSelected && isGroup(options) ? selectedGroupFontWeight : optionFontWeight,
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
      };
    },
    valueContainer: (provided, {selectProps}) => {
      return {
        ...provided,
        display: selectProps.isMulti ? 'grid' : 'flex',
        padding: 0,
        flex: 1,
        minWidth: 0,
        ...(selectProps.isMulti && {
          width: '100%',
        }),
      };
    },
    groupHeading: base => {
      return {
        ...base,
        color: theme.general.color,
        fontSize: theme.fontSizes.small,
        lineHeight: 1,
        padding: '8px 16px 6px',
        textAlign: 'left',
        ...groupHeadingCSS,
      };
    },
    group: provided => {
      return {
        ...provided,
        backgroundColor: theme.Input.backgroundColor,
        ...groupCSS,
      };
    },
    menuPortal: provided => {
      return {...provided, ...menuPortalCSS};
    },
  };
};
