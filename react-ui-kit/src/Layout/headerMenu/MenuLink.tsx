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

import {DESKTOP_HEADER_SUB_MENU_CLASSNAME} from './HeaderSubMenu';

import {QueryKeys, media} from '../../mediaQueries';
import {LinkProps, filterLinkProps, linkStyle} from '../../Text';
import {filterProps} from '../../util';
import {Theme} from '../Theme';

export interface MenuLinkProps<T = HTMLAnchorElement> extends LinkProps<T> {
  button?: boolean;
}

export const menuLinkStyle: <T>(theme: Theme, props: MenuLinkProps<T>) => CSSObject = (
  theme,
  {bold = true, color = theme.general.color, fontSize = '11px', textTransform = 'uppercase', button = false, ...props},
) => ({
  ...linkStyle(theme, {bold, color, fontSize, textTransform, ...props}),
  [media[QueryKeys.DESKTOP]]: {
    '&:first-of-type': {
      marginLeft: 0,
    },
    '&:last-of-type': {
      marginRight: 0,
    },
    margin: '0 26px 0 10px',
    [`.${DESKTOP_HEADER_SUB_MENU_CLASSNAME} &`]: {
      '&:first-of-type': {
        marginLeft: '10px',
      },
      '&:last-of-type': {
        marginRight: '26px',
      },
    },
  },
  [media[QueryKeys.TABLET_DOWN]]: {
    border: 'none',
    fontSize: '32px !important',
    fontWeight: 300,
    maxWidth: '480px',
    padding: '8px 24px',
    textTransform: 'none !important',
  },
  border: button ? '1px solid rgb(219, 226, 231)' : undefined,
  borderRadius: button ? '4px' : undefined,
  padding: button ? '10px 16px' : undefined,
});

export const MENU_LINK_CLASSNAME = 'menu-link';

export const filterMenuLinkProps = (props: MenuLinkProps) =>
  filterProps(filterLinkProps(props) as MenuLinkProps, ['button']);

export const MenuLink = (props: MenuLinkProps) => (
  <a
    className={MENU_LINK_CLASSNAME}
    css={(theme: Theme) => menuLinkStyle(theme, props)}
    {...filterMenuLinkProps(props)}
  />
);
