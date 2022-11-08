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

export interface MenuScrollableItemsProps<T = HTMLDivElement> extends React.HTMLProps<T> {
  open?: boolean;
}

export const menuScrollableItemsStyle: <T>(props: MenuScrollableItemsProps<T>) => CSSObject = _ => ({
  alignItems: 'center',
  alignSelf: 'center',
  display: 'flex',
  [media[QueryKeys.TABLET_DOWN]]: {
    alignItems: 'center',
    flexDirection: 'column',
    margin: 'auto',
  },
});

export const MenuScrollableItems = (props: MenuScrollableItemsProps) => (
  <div css={menuScrollableItemsStyle(props)} {...props} />
);
