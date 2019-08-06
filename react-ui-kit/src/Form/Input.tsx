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
import {ObjectInterpolation, jsx} from '@emotion/core';
import {TextTransformProperty} from 'csstype';
import React from 'react';
import {COLOR} from '../Identity';
import {Theme} from '../Layout';
import {TextProps} from '../Text';
import {filterProps} from '../util';

export interface InputProps<T = HTMLInputElement> extends TextProps<T> {
  markInvalid?: boolean;
  placeholderTextTransform?: TextTransformProperty;
}

export const inputStyle: <T>(theme: Theme, props: InputProps<T>) => ObjectInterpolation<undefined> = (
  theme,
  {markInvalid = false, placeholderTextTransform = 'uppercase', disabled = false},
) => {
  const placeholderStyle = {
    color: theme.Input.placeholderColor,
    fontSize: '11px',
    textTransform: placeholderTextTransform,
  };

  return {
    '&::-moz-placeholder': {
      ...placeholderStyle,
      opacity: 1,
    },
    '&::-ms-input-placeholder': {
      ...placeholderStyle,
    },
    '&::-webkit-input-placeholder': {
      ...placeholderStyle,
    },
    '&:invalid': !markInvalid
      ? {
          boxShadow: 'none',
        }
      : {},
    background: theme.Input.backgroundColor,
    border: 'none',
    borderRadius: '4px',
    boxShadow: markInvalid ? `0 0 0 1px ${COLOR.RED}` : 'none',
    caretColor: COLOR.BLUE,
    color: theme.general.color,
    fontWeight: 300,
    height: '56px',
    lineHeight: '24px',
    margin: '0 0 16px',
    opacity: disabled ? 0.56 : 1,
    outline: 'none',
    padding: '0 16px',
    width: '100%',
  };
};

export const INPUT_CLASSNAME = 'input';
const filterInputProps = (props: InputProps) => filterProps(props, ['markInvalid', 'placeholderTextTransform']);

export const Input: React.FC<InputProps<HTMLInputElement>> = React.forwardRef<
  HTMLInputElement,
  InputProps<HTMLInputElement>
>(({type, ...props}, ref) => (
  <input
    className={INPUT_CLASSNAME}
    css={theme => inputStyle(theme, props)}
    ref={ref}
    type={type}
    {...filterInputProps(props)}
  />
));
