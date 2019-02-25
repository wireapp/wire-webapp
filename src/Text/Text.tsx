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
import {COLOR} from '../Identity';
import {filterProps} from '../util';

export interface TextProps<T = HTMLSpanElement> extends React.HTMLProps<T> {
  block?: boolean;
  bold?: boolean;
  center?: boolean;
  color?: string;
  fontSize?: string;
  light?: boolean;
  muted?: boolean;
  noWrap?: boolean;
  textTransform?: TextTransformProperty;
  truncate?: boolean;
}

const filterTextProps = (props: Object) => {
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

export const textStyles: (props: TextProps) => ObjectInterpolation<undefined> = ({
  block = false,
  bold = false,
  center = false,
  color = COLOR.TEXT,
  fontSize = '16px',
  light = false,
  muted = false,
  noWrap = false,
  textTransform = 'none',
  truncate = false,
}) => ({
  color: color,
  display: block ? 'block' : 'inline',
  fontSize: fontSize,
  fontWeight: bold ? 600 : light ? 200 : 300,
  opacity: muted ? 0.56 : 1,
  overflow: truncate ? 'hidden' : undefined,
  textAlign: center ? 'center' : 'left',
  textOverflow: truncate ? 'ellipsis' : undefined,
  textTransform: textTransform,
  whiteSpace: noWrap ? 'nowrap' : undefined,
});

const Text = (props: TextProps) => <span css={textStyles(props)} {...filterTextProps(props)} />;

const Bold = (props: TextProps) => <Text bold {...props} />;
const Small = (props: TextProps) => <Text fontSize={'12px'} {...props} />;
const Muted = (props: TextProps) => <Text muted {...props} />;
const Uppercase = (props: TextProps) => <Text textTransform={'uppercase'} {...props} />;
const Large = (props: TextProps) => <Text fontSize={'48px'} light {...props} />;

export {Bold, Muted, Small, Text, Uppercase, Large, filterTextProps};
