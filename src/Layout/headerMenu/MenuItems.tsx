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

import {QueryKeys, media} from '../../mediaQueries';
import {filterProps} from '../../util';
import {Theme} from '../Theme';

export interface MenuItemsProps<T = HTMLDivElement> extends React.HTMLProps<T> {
  open?: boolean;
}

export const menuItemsStyle: <T>(theme: Theme, props: MenuItemsProps<T>) => CSSObject = (theme, props) => ({
  alignSelf: 'center',
  display: 'flex',
  justifySelf: 'end',
  [media[QueryKeys.TABLET_DOWN]]: {
    backgroundColor: theme.general.backgroundColor,
    bottom: 0,
    left: 0,
    overflowY: 'auto',
    position: 'fixed',
    right: 0,
    top: 0,
    transform: props.open ? 'translateX(0)' : 'translateX(110%)',
    transition: 'transform 0.25s ease',
    zIndex: 1,
  },
});

const filterMenuItemProps = (props: MenuItemsProps) => filterProps(props, ['open']);

export const MenuItems = (props: MenuItemsProps) => (
  <div css={(theme: Theme) => menuItemsStyle(theme, props)} {...filterMenuItemProps(props)} />
);
