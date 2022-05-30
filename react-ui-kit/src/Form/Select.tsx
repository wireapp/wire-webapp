/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

/** @jsx jsx */
import {CSSObject, jsx} from '@emotion/react';

import {COLOR_V2} from '../Identity';
import type {Theme} from '../Layout';
import {filterProps, inlineSVG} from '../util';
import {InputProps, inputStyle} from './Input';
import React, {ReactElement} from 'react';
import InputLabel from './InputLabel';

export interface SelectProps<T = HTMLSelectElement> extends InputProps<T> {
  helperText?: string;
  label?: string;
  disabled?: boolean;
  markInvalid?: boolean;
  error?: ReactElement;
}

const ArrowDown = (theme: Theme) => `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
        <path fill="${theme.general.color}" fill-rule="evenodd" clip-rule="evenodd" d="M7.99963 12.5711L15.6565 4.91421L14.2423 3.5L7.99963 9.74264L1.75699 3.5L0.342773 4.91421L7.99963 12.5711Z"/>
    </svg>
`;
export const selectStyle: <T>(theme: Theme, props: SelectProps<T>, error?: boolean) => CSSObject = (
  theme,
  {disabled = false, markInvalid, ...props},
  error = false,
) => ({
  ...inputStyle(theme, props),
  '&:-moz-focusring': {
    color: 'transparent',
    textShadow: '0 0 0 #000',
  },
  '&:disabled': {
    color: COLOR_V2.GRAY,
  },
  appearance: 'none',
  background: disabled
    ? `${theme.Input.backgroundColorDisabled} center right 16px no-repeat url("${inlineSVG(ArrowDown(theme))}")`
    : `${theme.Input.backgroundColor} center right 16px no-repeat url("${inlineSVG(ArrowDown(theme))}")`,
  boxShadow: markInvalid ? `0 0 0 1px ${COLOR_V2.RED}` : `0 0 0 1px ${COLOR_V2.GRAY_40}`,
  cursor: disabled ? 'normal' : 'pointer',
  fontSize: '16px',
  fontWeight: 300,
  paddingRight: '30px',
  marginBottom: error && '8px',
  '&:invalid, option:first-of-type': {
    color: COLOR_V2.RED,
  },
  ...(!disabled && {
    '&:hover': {
      boxShadow: `0 0 0 1px ${COLOR_V2.GRAY_60}`,
    },
    '&:focus, &:active': {
      boxShadow: `0 0 0 1px ${COLOR_V2.BLUE}`,
    },
  }),
});

const filterSelectProps = (props: SelectProps) => filterProps(props, ['markInvalid']);

export const Select = ({label, children, error, helperText, ...props}: SelectProps) => {
  const hasError = !!error;

  return (
    <div
      css={{
        marginBottom: props.markInvalid ? '2px' : '20px',
        '&:focus-within label': {
          color: COLOR_V2.BLUE,
        },
      }}
    >
      {label && (
        <InputLabel htmlFor={props.id} isRequired={props.required} markInvalid={props.markInvalid}>
          {label}
        </InputLabel>
      )}

      <select css={(theme: Theme) => selectStyle(theme, props, hasError)} {...filterSelectProps(props)}>
        <option disabled selected hidden>
          - Please select -
        </option>

        {children}
      </select>

      {!hasError && helperText && (
        <p css={{fontSize: '12px', fontWeight: 400, color: COLOR_V2.GRAY_80, marginTop: 8}}>{helperText}</p>
      )}

      {error}
    </div>
  );
};
