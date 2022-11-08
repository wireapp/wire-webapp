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

import * as React from 'react';

import {CSSObject} from '@emotion/react';
import type {Property} from 'csstype';

import {COLOR} from '../Identity';
import {Theme} from '../Layout';
import {TextProps} from '../Text';
import {filterProps} from '../util';

export interface TextAreaProps<T = HTMLTextAreaElement> extends TextProps<T> {
  markInvalid?: boolean;
  placeholderTextTransform?: Property.TextTransform;
}

export const textAreaStyle: <T>(theme: Theme, props: TextAreaProps<T>) => CSSObject = (
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
      boxShadow: `0 0 0 1px ${COLOR.BLUE}`,
    },
    '&:invalid': !markInvalid
      ? {
          boxShadow: `0 0 0 1px ${COLOR.GRAY}`,
        }
      : {},
    background: disabled ? theme.Input.backgroundColorDisabled : theme.Input.backgroundColor,
    border: 'none',
    borderRadius: '4px',
    boxShadow: markInvalid ? `0 0 0 1px ${COLOR.RED}` : `0 0 0 1px ${COLOR.GRAY}`,
    caretColor: COLOR.BLUE,
    color: theme.general.color,
    fontWeight: 300,
    lineHeight: '24px',
    margin: '0 0 16px',
    outline: 'none',
    padding: '16px 16px',
    resize: 'none',
    width: '100%',
  };
};

export const TEXTAREA_CLASSNAME = 'textarea';
const filterTextAreaProps = (props: TextAreaProps) => filterProps(props, ['markInvalid', 'placeholderTextTransform']);

export const TextArea: React.FC<TextAreaProps<HTMLTextAreaElement>> = React.forwardRef<
  HTMLTextAreaElement,
  TextAreaProps<HTMLTextAreaElement>
>((props, ref) => (
  <textarea
    className={TEXTAREA_CLASSNAME}
    css={(theme: Theme) => textAreaStyle(theme, props)}
    ref={ref}
    {...filterTextAreaProps(props)}
  />
));
TextArea.displayName = 'TextArea';
