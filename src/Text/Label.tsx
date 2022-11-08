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

import {CSSObject} from '@emotion/react';

import {LinkProps, linkStyle} from './Link';
import {TextProps, filterTextProps, textStyle} from './Text';

import {COLOR} from '../Identity';
import {Theme} from '../Layout';

export interface LabelProps<T = HTMLSpanElement> extends TextProps<T> {
  markInvalid?: boolean;
}

const labelStyle: <T>(theme: Theme, props: LabelProps<T>) => CSSObject = (
  theme,
  {markInvalid, bold = false, color = theme.general.color, fontSize = '12px', ...props},
) => ({
  ...textStyle(theme, {bold, color, fontSize, ...props}),
  '&:focus-within': {
    color: COLOR.BLUE,
  },
  color: markInvalid ? COLOR.RED : 'initial',
  width: '100%',
});

export const Label = (props: LabelProps) => (
  <label css={(theme: Theme) => labelStyle(theme, props)} {...filterTextProps(props)} />
);

export type LabelLinkProps<T = HTMLAnchorElement> = LinkProps<T>;

const labelLinkStyle: <T>(theme, props: LabelLinkProps<T>) => CSSObject = (theme, {fontSize = '12px', ...props}) => ({
  ...linkStyle(theme, {fontSize, ...props}),
});

export const LabelLink = (props: LabelProps<HTMLAnchorElement>) => (
  <a css={(theme: Theme) => labelLinkStyle(theme, props)} {...filterTextProps(props)} />
);
