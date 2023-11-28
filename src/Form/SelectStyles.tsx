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

import {inputStyle} from './Input';
import {isGroup} from './SelectComponents';

import {Theme} from '../Layout';

export const customStyles = (theme: Theme, markInvalid = false) => ({
  indicatorSeparator: () => ({
    display: 'none',
  }),
  indicatorsContainer: provided => ({
    ...provided,
  }),
  container: (_, {isDisabled, selectProps, options}) => {
    const {menuIsOpen} = selectProps;
    const isSelectDisabled = selectProps.isDisabled;

    return {
      '& > div': isGroup(options)
        ? {
            display: 'inline',
            position: 'relative',
            top: '-10px',
          }
        : {
            ...inputStyle(theme, {disabled: isSelectDisabled, markInvalid}),
            padding: 0,
            height: 'auto',
            minHeight: '48px',
            '&:-moz-focusring': {
              color: 'transparent',
              textShadow: '0 0 0 #000',
            },
            position: 'relative',
            ...(isDisabled && {
              backgroundColor: theme.Input.backgroundColorDisabled,
              color: theme.Select.disabledColor,
              cursor: 'default',
            }),
            ...(markInvalid && {
              boxShadow: `0 0 0 1px ${theme.general.dangerColor}`,
            }),
            ...(menuIsOpen && {
              boxShadow: `0 0 0 1px ${theme.general.primaryColor}`,
              '&:hover': {
                boxShadow: `0 0 0 1px ${theme.general.primaryColor}`,
              },
            }),
            cursor: !isSelectDisabled && 'pointer',
            '&:focus:visible, active': {
              boxShadow: !isSelectDisabled && `0 0 0 1px ${theme.general.primaryColor}`,
            },
          },
    };
  },
  control: (_provided, {options}) => ({
    display: isGroup(options) ? 'none' : 'flex',
    alignItems: 'center',
    appearance: 'none',
    padding: '0 8px 0 16px',
    height: 'auto',
    minHeight: '48px',
  }),
  dropdownIndicator: (provided, selectProps) => {
    const isSelectDisabled = selectProps.isDisabled;
    return {
      ...provided,
      '& > svg': {
        fill: isSelectDisabled && theme.Input.placeholderColor,
      },
    };
  },
  group: provided => ({
    ...provided,
    padding: 0,
    backgroundColor: theme.Input.backgroundColor,
  }),
  groupHeading: provided => ({
    ...provided,
    display: 'flex',
    fontSize: theme.fontSizes.small,
    lineHeight: '14px',
    color: theme.Select.disabledColor,
    padding: '8px 16px 6px 16px',
  }),
  menu: (provided, {options}) => ({
    ...provided,
    boxShadow: `0 0 0 1px ${theme.general.primaryColor}, 0 4px 11px hsl(0deg 0% 0% / 10%)`,
    borderRadius: 12,
    marginBottom: 0,
    marginTop: 4,
    overflowY: 'overlay',
    ...(isGroup(options) && {
      minWidth: '400px',
    }),
  }),
  menuList: provided => ({
    ...provided,
    borderRadius: 12,
    paddingBottom: 0,
    paddingTop: 0,
    maxHeight: 'fit-content',
  }),
  option: (provided, {isMulti, isDisabled, isFocused, isSelected, options, data}) => ({
    ...provided,
    backgroundColor: theme.Input.backgroundColor,
    color: theme.general.color,
    padding: isGroup(options) ? '6px 16px' : '10px 18px',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    fontSize: theme.fontSizes.base,
    fontWeight: isSelected && isGroup(options) ? 600 : 400,
    lineHeight: '1.5rem',
    ...(isSelected &&
      !isDisabled &&
      !isMulti && {
        background: theme.general.primaryColor,
        borderColor: theme.general.primaryColor,
        color: theme.Select.contrastTextColor,
        '&:hover': {
          backgroundColor: theme.Select.selectedActiveBg,
        },
        '&:active': {
          backgroundColor: theme.general.primaryColor,
          boxShadow: `inset 0 0 0 1px ${theme.Select.selectedActiveBg}`,
          color: theme.general.contrastColor,
        },
      }),
    ...(isFocused &&
      !isDisabled &&
      !isSelected && {
        backgroundColor: theme.Select.optionHoverBg,
        borderColor: theme.Select.optionHoverBg,
        color: theme.general.color,
        '&:active': {
          background: theme.Select.optionHoverBg,
          boxShadow: `inset 0 0 0 1px ${theme.Select.selectedActiveBg}`,
          color: theme.general.color,
        },
      }),
    ...(isMulti &&
      isSelected && {
        backgroundColor: theme.Input.backgroundColor,
        '&:hover': {
          backgroundColor: theme.Select.optionHoverBg,
        },
        '&:active': {
          background: theme.Select.optionHoverBg,
          boxShadow: `inset 0 0 0 1px ${theme.Select.selectedActiveBg}`,
          color: theme.general.color,
        },
      }),
    ...(isDisabled && {
      backgroundColor: theme.Input.backgroundColorDisabled,
      color: theme.Select.disabledColor,
      '&:hover, &:active, &:focus': {
        backgroundColor: theme.Select.borderColor,
        color: theme.Select.disabledColor,
      },
      ...(isFocused && {
        backgroundColor: theme.Select.borderColor,
        color: theme.Select.disabledColor,
      }),
    }),

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
        borderRadius: '12px 12px 0 0',
      },
    }),
    ...(isGroup(options) && {
      textAlign: 'left',
    }),
    '&:last-of-type': {
      ...(!isGroup(options) && {borderRadius: '0 0 12px 12px'}),
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
  singleValue: (provided, selectProps) => {
    const isSelectDisabled = selectProps.isDisabled;
    return {
      ...provided,
      color: isSelectDisabled ? theme.Input.placeholderColor : theme.general.color,
    };
  },
});
