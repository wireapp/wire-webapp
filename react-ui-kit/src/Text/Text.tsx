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
import {filterProps} from '../util';

export interface TextProps<T = HTMLSpanElement> extends React.PropsWithRef<React.HTMLProps<T>> {
  block?: boolean;
  bold?: boolean;
  center?: boolean;
  color?: string;
  fontSize?: string;
  light?: boolean;
  muted?: boolean;
  noWrap?: boolean;
  textTransform?: Property.TextTransform;
  truncate?: boolean;
}

export const filterTextProps = (props: TextProps) => {
  return filterProps(props, [
    'block',
    'bold',
    'center',
    'color',
    'fontSize',
    'light',
    'muted',
    'noWrap',
    'textTransform',
    'truncate',
  ]);
};

export const textStyle: <T>(theme: Theme, props: TextProps<T>) => CSSObject = (
  theme,
  {
    block = false,
    bold = false,
    center = false,
    color = theme.general.color,
    fontSize = theme.fontSizes.base,
    light = false,
    muted = false,
    noWrap = false,
    textTransform = 'none',
    truncate = false,
  },
) => ({
  color: muted ? COLOR.GRAY : color,
  display: block ? 'block' : 'inline',
  fontSize: fontSize,
  fontWeight: bold ? 600 : light ? 200 : 300,
  overflow: truncate ? 'hidden' : undefined,
  textAlign: center ? 'center' : 'left',
  textOverflow: truncate ? 'ellipsis' : undefined,
  textTransform: textTransform,
  whiteSpace: noWrap ? 'nowrap' : undefined,
});

export const Text = React.forwardRef<HTMLSpanElement, TextProps<HTMLSpanElement>>((props, ref) => (
  <span ref={ref} css={(theme: Theme) => textStyle(theme, props)} {...filterTextProps(props)} />
));
Text.displayName = 'Text';

export const Bold = React.forwardRef<HTMLSpanElement, TextProps<HTMLSpanElement>>((props, ref) => (
  <Text ref={ref} bold {...props} />
));
Bold.displayName = 'Bold';

export const Small = React.forwardRef<HTMLSpanElement, TextProps<HTMLSpanElement>>((props, ref) => (
  <Text ref={ref} fontSize={'12px'} {...props} />
));
Small.displayName = 'Small';

export const Muted = React.forwardRef<HTMLSpanElement, TextProps<HTMLSpanElement>>((props, ref) => (
  <Text ref={ref} muted {...props} />
));
Muted.displayName = 'Muted';

export const Uppercase = React.forwardRef<HTMLSpanElement, TextProps<HTMLSpanElement>>((props, ref) => (
  <Text ref={ref} textTransform={'uppercase'} {...props} />
));
Uppercase.displayName = 'Uppercase';

export const Large = React.forwardRef<HTMLSpanElement, TextProps<HTMLSpanElement>>((props, ref) => (
  <Text ref={ref} fontSize={'48px'} light {...props} />
));
Large.displayName = 'Large';
