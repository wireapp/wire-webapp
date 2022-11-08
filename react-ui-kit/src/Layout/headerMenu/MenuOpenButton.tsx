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

export interface MenuOpenButtonProps<T = HTMLDivElement> extends React.HTMLProps<T> {
  open?: boolean;
}

export const menuOpenButtonStyle: <T>(theme: Theme, props: MenuOpenButtonProps<T>) => CSSObject = (theme, {open}) => ({
  display: 'block',
  div: {
    backgroundColor: theme.general.color,
    height: '2px',
    margin: '4px',
    transition: 'all 0.25s ease-in-out',
    width: '16px',
  },
  'div:nth-of-type(1)': {
    transform: open ? 'translateY(6px) rotate(-45deg)' : undefined,
  },
  'div:nth-of-type(2)': {
    opacity: open ? 0 : undefined,
    transform: open ? 'scale(0, 1)' : undefined,
  },
  'div:nth-of-type(3)': {
    transform: open ? 'translateY(-6px) rotate(45deg)' : undefined,
  },
  [media[QueryKeys.DESKTOP]]: {
    display: 'none',
  },
  zIndex: 2,
});

const filterMenuOpenButtonProps = (props: MenuOpenButtonProps) => filterProps(props, ['open']);

export const MenuOpenButton = (props: MenuOpenButtonProps) => (
  <div css={(theme: Theme) => menuOpenButtonStyle(theme, props)} {...filterMenuOpenButtonProps(props)}>
    <div />
    <div />
    <div />
  </div>
);
