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
import {COLOR} from '../../Identity';
import media, {QueryKeys} from '../../mediaQueries';

export interface MenuItemsProps<T = HTMLDivElement> extends React.HTMLProps<T> {
  open?: boolean;
}

const menuItemsStyles: <T>(props: MenuItemsProps<T>) => ObjectInterpolation<undefined> = props => ({
  [media[QueryKeys.TABLET_DOWN]]: {
    backgroundColor: COLOR.WHITE,
    bottom: 0,
    display: 'flex',
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

const MenuItems = (props: MenuItemsProps) => <div css={menuItemsStyles(props)} {...props} />;

export {MenuItems, menuItemsStyles};
