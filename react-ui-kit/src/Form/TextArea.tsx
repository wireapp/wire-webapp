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
import {TextProps} from '../Text';
import {filterProps} from '../util';

export interface TextAreaProps<T = HTMLTextAreaElement> extends TextProps<T> {
  markInvalid?: boolean;
  placeholderTextTransform?: TextTransformProperty;
}

const textAreaStyle: <T>(props: TextAreaProps<T>) => ObjectInterpolation<undefined> = ({
  markInvalid = false,
  placeholderTextTransform = 'uppercase',
  disabled = false,
}) => {
  const placeholderStyle = {
    color: COLOR.GRAY_DARKEN_24,
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
    background: disabled ? COLOR.shade(COLOR.WHITE, 0.06) : COLOR.WHITE,
    border: 'none',
    borderRadius: '4px',
    boxShadow: markInvalid ? `0 0 0 1px ${COLOR.RED}` : 'none',
    caretColor: COLOR.BLUE,
    color: COLOR.TEXT,
    fontWeight: 300,
    lineHeight: '24px',
    margin: '0 0 16px',
    outline: 'none',
    padding: '16px 16px',
    resize: 'none',
    width: '100%',
  };
};

const TEXTAREA_CLASSNAME = 'textarea';
const filterTextAreaProps = (props: Object) => filterProps(props, ['markInvalid', 'placeholderTextTransform']);

const TextArea: React.FC<TextAreaProps<HTMLTextAreaElement>> = React.forwardRef<
  HTMLTextAreaElement,
  TextAreaProps<HTMLTextAreaElement>
>((props, ref) => (
  <textarea className={TEXTAREA_CLASSNAME} css={textAreaStyle(props)} ref={ref} {...filterTextAreaProps(props)} />
));

export {TEXTAREA_CLASSNAME, TextArea, textAreaStyle};
