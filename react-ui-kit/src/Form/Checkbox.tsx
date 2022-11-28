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

import {useId} from 'react';
import * as React from 'react';

import {INPUT_CLASSNAME, InputProps} from './Input';

import {Theme} from '../Layout';
import {Text, TextProps, textStyle} from '../Text';

export interface StyledLabelProps<T = HTMLLabelElement> extends React.HTMLProps<T> {
  disabled?: boolean;
  markInvalid?: boolean;
  aligncenter?: boolean;
  labelBeforeCheckbox?: boolean;
}

const StyledLabel = ({
  disabled,
  markInvalid,
  aligncenter = false,
  labelBeforeCheckbox = false,
  children,
  ...props
}: StyledLabelProps) => {
  return (
    <label
      css={(theme: Theme) => ({
        [`.${INPUT_CLASSNAME}:checked + &::before`]: {
          background: `${disabled ? theme.Checkbox.disablecheckedBgColor : theme.general.primaryColor}`,
          borderColor: theme.general.primaryColor,
        },
        [`.${INPUT_CLASSNAME}:checked + & > svg`]: {
          fill: theme.general.backgroundColor,
        },
        [`.${INPUT_CLASSNAME} + & > svg`]: {
          fill: 'none',
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          ...(labelBeforeCheckbox
            ? {
                right: '11px',
              }
            : {
                left: '4px',
              }),
        },
        ...(!disabled && {
          [`.${INPUT_CLASSNAME}:hover + &::before`]: {
            borderColor: theme.general.primaryColor,
          },
        }),
        [`.${INPUT_CLASSNAME} + &::before`]: {
          background: disabled ? theme.Checkbox.disableBgColor : theme.Checkbox.background,
          ...(!disabled
            ? {
                border: markInvalid
                  ? `2px solid ${theme.Checkbox.invalidBorderColor}`
                  : `2px solid ${theme.Checkbox.border}`,
              }
            : {
                border: `2px solid ${theme.Checkbox.disableBorderColor}`,
              }),
          borderRadius: '3px',
          boxSizing: 'border-box',
          content: '""',
          display: 'inline-block',
          width: '22px',
          height: '22px',
          lineHeight: '1.4rem',
          margin: '0 8px 0 0px',
          color: theme.general.color,
        },
        ...(labelBeforeCheckbox && {
          flexDirection: 'row-reverse',
          justifyContent: 'space-between',
        }),
        alignItems: 'center',
        position: 'relative',
        margin: '0 0 0 -16px',
        width: aligncenter ? 'auto' : '100%',
        lineHeight: '1.4rem',
        display: 'flex',
        opacity: disabled ? 0.56 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        borderRadius: '4px',
      })}
      {...props}
    >
      {children}
      <svg width="15" height="13" viewBox="0 0 16 13" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.65685 12.0711L15.9842 1.62738L14.57 0.213167L5.65685 9.24264L1.41421 5L0 6.41421L5.65685 12.0711Z" />
      </svg>
    </label>
  );
};

interface CheckboxProps<T = HTMLInputElement> extends InputProps<T> {
  id?: string;
  aligncenter?: boolean;
  labelBeforeCheckbox?: boolean;
  outlineOffset?: string;
}

export const Checkbox: React.FC<CheckboxProps> = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      id,
      children,
      style,
      disabled,
      wrapperCSS = {},
      markInvalid,
      aligncenter,
      labelBeforeCheckbox,
      outlineOffset = '0.4rem',
      ...props
    },
    ref,
  ) => {
    const inputId = useId();

    return (
      <div
        css={(theme: Theme) => ({
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'flex-start',
          position: 'relative',
          left: '-0.3rem',
          [`.${INPUT_CLASSNAME}:focus-visible + label`]: {
            outline: `1px solid ${theme.general.primaryColor}`,
            outlineOffset: outlineOffset,
          },
          ...wrapperCSS,
        })}
        style={style}
      >
        <input
          type="checkbox"
          id={id ?? inputId}
          style={{
            height: '22px',
            marginBottom: '0',
            opacity: 0,
            width: '22px',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          disabled={disabled}
          ref={ref}
          className={INPUT_CLASSNAME}
          {...props}
        />

        <StyledLabel
          htmlFor={id ?? inputId}
          disabled={disabled}
          markInvalid={markInvalid}
          aligncenter={aligncenter}
          labelBeforeCheckbox={labelBeforeCheckbox}
        >
          {children}
        </StyledLabel>
      </div>
    );
  },
);
Checkbox.displayName = 'Checkbox';

export type CheckboxLabelProps<T = HTMLSpanElement> = TextProps<T>;

export const CheckboxLabel = ({...props}: CheckboxLabelProps) => (
  <Text
    css={(theme: Theme) => ({
      ...textStyle(theme, {
        ...props,
      }),
    })}
    {...props}
  />
);
