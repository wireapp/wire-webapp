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
import {jsx} from '@emotion/core';
import React from 'react';
import {COLOR} from '../Identity';
import {Text, TextProps, linkStyle, textStyle} from '../Text';
import {INPUT_CLASSNAME, Input, InputProps} from './Input';

export interface StyledLabelProps<T = HTMLLabelElement> extends React.HTMLProps<T> {
  disabled?: boolean;
  markInvalid?: boolean;
}

const StyledLabel = (props: StyledLabelProps) => {
  const checkSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="6" viewBox="0 0 8 6"><path fill="white" d="M2.8 6L8 .7 7.3 0 2.8 4.6.7 2.4l-.7.7z"/></svg>';
  return (
    <label
      css={{
        [`${INPUT_CLASSNAME}:checked + &::before`]: {
          background: `#000 url('data:image/svg+xml; utf8, ${checkSvg}') no-repeat center`,
        },
        [`${INPUT_CLASSNAME}:focus + &::before`]: {
          borderColor: COLOR.BLUE,
        },
        '&::before': {
          border: props.markInvalid ? `2px solid ${COLOR.RED}` : '2px solid rgba(0, 0, 0, 0.4)',
          borderRadius: '4px',
          boxSizing: 'border-box',
          content: '""',
          display: 'inline-block',
          height: '16px',
          margin: '0 8px 0 -16px',
          opacity: props.disabled ? 0.56 : 1,
          width: '16px',
        },
        a: {
          ...linkStyle({}),
        },
        display: 'flex',
        opacity: props.disabled ? 0.56 : 1,
      }}
      {...props}
    />
  );
};

interface CheckboxProps<T = HTMLInputElement> extends InputProps<T> {
  id?: string;
}

const Checkbox: React.FC<CheckboxProps<HTMLInputElement>> = React.forwardRef<
  HTMLInputElement,
  CheckboxProps<HTMLInputElement>
>(({id = Math.random().toString(), children, style, disabled, ...props}, ref) => (
  <div
    css={{
      alignItems: 'center',
      display: 'flex',
      justifyContent: 'flex-start',
    }}
    style={style}
  >
    <Input
      type={'checkbox'}
      id={id}
      style={{
        height: '16px',
        marginBottom: '0',
        opacity: 0,
        width: '16px',
      }}
      disabled={disabled}
      ref={ref}
      {...props}
    />
    <StyledLabel htmlFor={id} disabled={disabled} markInvalid={props.markInvalid}>
      {children}
    </StyledLabel>
  </div>
));

export interface CheckboxLabelProps<T = HTMLSpanElement> extends TextProps<T> {}

const CheckboxLabel = ({
  bold = true,
  color = COLOR.GRAY_DARKEN_24,
  fontSize = '11px',
  textTransform = 'uppercase',
  ...props
}: CheckboxLabelProps) => (
  <Text
    css={{
      ...textStyle({
        bold,
        color,
        fontSize,
        textTransform,
        ...props,
      }),
      a: {
        color: COLOR.LINK,
        textDecoration: 'none',
      },
    }}
    {...props}
  />
);

export {Checkbox, CheckboxLabel};
