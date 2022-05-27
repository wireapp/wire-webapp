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
import type {Property} from 'csstype';
import React, {ReactElement, useState} from 'react';

import {COLOR_V2} from '../Identity';
import type {Theme} from '../Layout';
import type {TextProps} from '../Text';
import {filterProps} from '../util';
import {ErrorIcon, HideIcon, ShowIcon} from '../Icon';

export interface InputProps<T = HTMLInputElement> extends TextProps<T> {
  label?: string;
  isRequired?: boolean;
  error?: ReactElement;
  markInvalid?: boolean;
  helperText?: string;
  placeholderTextTransform?: Property.TextTransform;
}

export const inputStyle: <T>(theme: Theme, props: InputProps<T>, hasError?: boolean) => CSSObject = (
  theme,
  {markInvalid = false, placeholderTextTransform = 'none', disabled = false},
) => {
  const placeholderStyle = {
    color: theme.Input.placeholderColor,
    fontSize: '16px',
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
    '&:focus': {
      boxShadow: `0 0 0 1px ${COLOR_V2.BLUE}`,
    },
    '&:invalid:not(:focus)': !markInvalid
      ? {
          boxShadow: `0 0 0 1px ${COLOR_V2.GRAY}`,
        }
      : {},
    background: disabled ? theme.Input.backgroundColorDisabled : theme.Input.backgroundColor,
    border: 'none',
    borderRadius: '4px',
    boxShadow: markInvalid ? `0 0 0 1px ${COLOR_V2.RED}` : `0 0 0 1px ${COLOR_V2.GRAY}`,
    caretColor: COLOR_V2.BLUE,
    color: theme.general.color,
    fontWeight: 300,
    height: '48px',
    lineHeight: '24px',
    outline: 'none',
    padding: '0 16px',
    width: '100%',
  };
};

export const INPUT_CLASSNAME = 'wireinput';
export const INPUT_GROUP = 'input-group';

const filterInputProps = (props: InputProps) => filterProps(props, ['markInvalid', 'placeholderTextTransform']);

const centerInputAction: CSSObject = {
  position: 'absolute',
  right: '16px',
  top: '50%',
  transform: 'translateY(-50%)',
};

export const Input: React.FC<InputProps<HTMLInputElement>> = React.forwardRef<
  HTMLInputElement,
  InputProps<HTMLInputElement>
>(({type, label, isRequired, error, helperText, ...props}, ref) => {
  const [togglePassword, setTogglePassword] = useState<boolean>(false);

  const hasError = !!error;
  const isPasswordInput = type === 'password';
  const toggledPasswordType = togglePassword ? 'text' : 'password';

  const toggleSetPassword = () => setTogglePassword(prevState => !prevState);

  return (
    <div
      className={INPUT_GROUP}
      css={{
        marginBottom: hasError ? '2px' : '20px',
        '&:focus-within label': {
          color: COLOR_V2.BLUE,
        },
      }}
    >
      {label && (
        <label
          htmlFor={props.id}
          css={{
            fontSize: '14px',
            fontWeight: 400,
            lineHeight: '16px',
            color: props.markInvalid ? COLOR_V2.RED_LIGHT_500 : COLOR_V2.GRAY_80,
          }}
        >
          {label}
          {isRequired && <span css={{fontSize: '16px', marginLeft: '4px', color: COLOR_V2.RED_LIGHT_500}}>*</span>}
        </label>
      )}

      <div css={{marginBottom: hasError && '8px', position: 'relative'}}>
        <input
          className={INPUT_CLASSNAME}
          css={(theme: Theme) => inputStyle(theme, props, hasError)}
          ref={ref}
          type={isPasswordInput ? toggledPasswordType : type}
          aria-required={isRequired}
          {...filterInputProps(props)}
        />

        {hasError && !isPasswordInput && (
          <ErrorIcon css={centerInputAction} width={16} height={16} aria-hidden="true" />
        )}

        {isPasswordInput && (
          <button
            type="button"
            css={{...centerInputAction, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0}}
            onClick={toggleSetPassword}
            aria-controls={props.id}
            aria-expanded={togglePassword}
          >
            {togglePassword ? <HideIcon color={COLOR_V2.BLACK} /> : <ShowIcon color={COLOR_V2.BLACK} />}
          </button>
        )}
      </div>

      {!hasError && helperText && (
        <p css={{fontSize: '12px', fontWeight: 400, color: COLOR_V2.GRAY_80, marginTop: 8}}>{helperText}</p>
      )}

      {error}
    </div>
  );
});
