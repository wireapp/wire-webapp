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
import {CSSObject, jsx} from '@emotion/react';

import {COLOR_V2} from '../Identity/colors-v2';
import {Theme} from '../Layout';
import {LinkProps, filterLinkProps, linkStyle} from './Link';

export type TextLinkProps<T = HTMLAnchorElement> = LinkProps<T>;

export const textLinkStyle: <T>(theme: Theme, props: TextLinkProps<T>) => CSSObject = (
  theme,
  {color = COLOR_V2.BLUE, fontSize = '16px', bold = false, textTransform = 'none', ...props},
) => ({
  ...linkStyle(theme, {bold, color, fontSize, textTransform, ...props}),
});

export const TextLink = (props: TextLinkProps<HTMLAnchorElement>) => (
  <a css={(theme: Theme) => textLinkStyle(theme, props)} rel="noopener noreferrer" {...filterLinkProps(props)} />
);
