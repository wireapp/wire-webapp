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

    return {
      ...inputStyle(theme, {disabled: isDisabled, markInvalid}),
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
      }),
      ...(!menuIsOpen && {
        '&:hover': {
          boxShadow: `0 0 0 1px ${theme.Select.borderColor}`,
        },
        '&:focus, &:active': {
          boxShadow: `0 0 0 1px ${theme.general.primaryColor}`,
        },
      }),
      cursor: 'pointer',
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
  menu: provided => ({
    ...provided,
    boxShadow: `0 0 0 1px ${theme.general.primaryColor}, 0 4px 11px hsl(0deg 0% 0% / 10%)`,
    borderRadius: 12,
    marginBottom: 0,
    marginTop: 4,
  }),
  menuList: provided => ({
    ...provided,
    paddingBottom: 0,
    paddingTop: 0,
  }),
  option: (provided, {isDisabled, isFocused, isSelected}) => ({
    ...provided,
    padding: '10px 18px',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    fontSize: '16px',
    fontWeight: 300,
    lineHeight: '24px',
    ...(isSelected && {
      backgroundColor: 'inherit',
      color: 'inherit',
    }),
    ...(isFocused && {
      background: theme.general.primaryColor,
      borderColor: theme.general.primaryColor,
      color: theme.Select.contrastTextColor,
    }),
    '&:hover, &:active, &:focus': {
      background: theme.general.primaryColor,
      borderColor: theme.general.primaryColor,
      color: theme.Select.contrastTextColor,
    },
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
});
