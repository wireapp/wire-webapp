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
import {Theme} from '../Layout';
import {LinkProps, linkStyle} from './Link';
import {TextProps, filterTextProps, textStyle} from './Text';

export type LabelProps<T = HTMLSpanElement> = TextProps<T>;

const labelStyle: <T>(theme: Theme, props: LabelProps<T>) => ObjectInterpolation<undefined> = (
  theme,
  {bold = true, color = theme.general.color, fontSize = '12px', ...props},
) => ({
  ...textStyle(theme, {bold, color, fontSize, ...props}),
});

export const Label = (props: LabelProps) => (
  <span css={theme => labelStyle(theme, props)} {...filterTextProps(props)} />
);

export type LabelLinkProps<T = HTMLAnchorElement> = LinkProps<T>;

const labelLinkStyle: <T>(theme, props: LabelLinkProps<T>) => ObjectInterpolation<undefined> = (
  theme,
  {fontSize = '12px', ...props},
) => ({
  ...linkStyle(theme, {fontSize, ...props}),
});

export const LabelLink = (props: LabelProps<HTMLAnchorElement>) => (
  <a css={theme => labelLinkStyle(theme, props)} {...filterTextProps(props)} />
);
