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

import {ReactElement, useState} from 'react';
import * as React from 'react';

import {CSSObject} from '@emotion/react';
import type {Property} from 'csstype';

import {InputLabel} from './InputLabel';

import {ErrorIcon, HideIcon, ShowIcon} from '../Icon';
import {Theme} from '../Layout';
import {TextProps} from '../Text';
import {filterProps} from '../util';

export interface InputProps<T = HTMLInputElement> extends TextProps<T> {
  label?: string;
  error?: ReactElement;
  markInvalid?: boolean;
  helperText?: string;
  placeholderTextTransform?: Property.TextTransform;
  wrapperCSS?: CSSObject;
  inputCSS?: CSSObject;
  size?: number;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
}

export const inputStyle: <T>(theme: Theme, props: InputProps<T>, hasError?: boolean) => CSSObject = (
  theme,
  {markInvalid = false, placeholderTextTransform = 'none', disabled = false},
) => {
  const placeholderStyle = {
    color: theme.Input.placeholderColor,
    fontSize: theme.fontSizes.base,
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
    '&:hover': {
      boxShadow: !disabled && `0 0 0 1px ${theme.Input.borderHover}`,
    },
    '&:focus-visible, &:focus, &:active': {
      boxShadow: `0 0 0 1px ${theme.general.primaryColor}`,
    },
    '&:invalid:not(:focus, :hover)': !markInvalid
      ? {
          boxShadow: `0 0 0 1px ${theme.Select.borderColor}`,
        }
      : {},
    background: disabled ? theme.Input.backgroundColorDisabled : theme.Input.backgroundColor,
    border: 'none',
    borderRadius: '12px',
    boxShadow: markInvalid ? `0 0 0 1px ${theme.general.dangerColor}` : `0 0 0 1px ${theme.Select.borderColor}`,
    caretColor: theme.general.primaryColor,
    color: theme.general.color,
    fontWeight: 400,
    height: '48px',
    lineHeight: '1.5rem',
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
>(
  (
    {
      type,
      label,
      error,
      helperText,
      startContent = null,
      endContent = null,
      inputCSS = {},
      wrapperCSS = {},
      className = '',
      ...props
    },
    ref,
  ) => {
    const [togglePassword, setTogglePassword] = useState<boolean>(false);

    const hasError = !!error;
    const isPasswordInput = type === 'password';
    const toggledPasswordType = togglePassword ? 'text' : 'password';

    const toggleSetPassword = () => setTogglePassword(prevState => !prevState);

    return (
      <div
        className={INPUT_GROUP}
        css={(theme: Theme) => ({
          marginBottom: hasError ? '2px' : '20px',
          width: '100%',
          '&:focus-within label': {
            color: theme.general.primaryColor,
          },
          ...wrapperCSS,
        })}
      >
        {label && (
          <InputLabel htmlFor={props.id} isRequired={props.required} markInvalid={props.markInvalid}>
            {label}
          </InputLabel>
        )}

        <div css={{marginBottom: hasError && '8px', position: 'relative'}}>
          {startContent}

          <input
            className={INPUT_CLASSNAME}
            css={(theme: Theme) => ({
              ...inputStyle(theme, props, hasError),
              ...inputCSS,
            })}
            ref={ref}
            type={isPasswordInput ? toggledPasswordType : type}
            aria-required={props.required}
            {...filterInputProps(props)}
          />

          {endContent}

          {hasError && !isPasswordInput && (
            <ErrorIcon css={centerInputAction} width={16} height={16} aria-hidden="true" />
          )}

          {isPasswordInput && (
            <button
              type="button"
              data-uie-name={!togglePassword ? 'do-show-password' : 'do-hide-password'}
              css={{...centerInputAction, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0}}
              onClick={toggleSetPassword}
              title="Toggle password visibility"
              aria-controls={props.id}
              aria-expanded={togglePassword}
            >
              {togglePassword ? <HideIcon /> : <ShowIcon />}
            </button>
          )}
        </div>

        {!hasError && helperText && (
          <p
            css={(theme: Theme) => ({
              fontSize: theme.fontSizes.small,
              fontWeight: 400,
              color: theme.Input.placeholderColor,
              marginTop: 8,
            })}
          >
            {helperText}
          </p>
        )}

        {error}
      </div>
    );
  },
);
Input.displayName = 'Input';
