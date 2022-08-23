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

import {Theme} from '../Layout';
import {inputStyle} from './Input';

export const customStyles = (theme: Theme, markInvalid = false) => ({
  indicatorSeparator: () => ({
    display: 'none',
  }),
  indicatorsContainer: provided => ({
    ...provided,
  }),
  container: (provided, {isDisabled, selectProps}) => {
    const {menuIsOpen} = selectProps;
    const isSelectDisabled = selectProps.isDisabled;

    return {
      '& > div': {
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
  control: () => ({
    display: 'flex',
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
  menu: provided => ({
    ...provided,
    boxShadow: `0 0 0 1px ${theme.general.primaryColor}, 0 4px 11px hsl(0deg 0% 0% / 10%)`,
    borderRadius: 12,
    marginBottom: 0,
    marginTop: 4,
    overflowY: 'overlay',
  }),
  menuList: provided => ({
    ...provided,
    borderRadius: 12,
    paddingBottom: 0,
    paddingTop: 0,
  }),
  option: (provided, {isMulti, isDisabled, isFocused, isSelected}) => ({
    ...provided,
    backgroundColor: theme.Input.backgroundColor,
    color: theme.general.color,
    padding: '10px 18px',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    fontSize: '16px',
    fontWeight: 300,
    lineHeight: '24px',
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
    '&:not(:last-of-type)': {
      borderBottom: `1px solid ${theme.Select.borderColor}`,
    },
    '&:first-of-type': {
      borderRadius: '12px 12px 0 0',
    },
    '&:last-of-type': {
      borderRadius: '0 0 12px 12px',
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
