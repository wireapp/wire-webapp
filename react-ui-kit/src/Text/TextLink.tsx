/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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
import {COLOR} from '../Identity/colors';
import {Theme} from '../Layout';
import {LinkProps, filterLinkProps, linkStyle} from './Link';

export type TextLinkProps<T = HTMLAnchorElement> = LinkProps<T>;

export const textLinkStyle: <T>(theme: Theme, props: TextLinkProps<T>) => ObjectInterpolation<undefined> = (
  theme,
  {color = COLOR.BLUE, fontSize = '16px', bold = false, textTransform = 'none', ...props},
) => ({
  ...linkStyle(theme, {color, fontSize, bold, textTransform, ...props}),
});

export const TextLink = (props: TextLinkProps<HTMLAnchorElement>) => (
  <a css={theme => textLinkStyle(theme, props)} {...filterLinkProps(props)} />
);
