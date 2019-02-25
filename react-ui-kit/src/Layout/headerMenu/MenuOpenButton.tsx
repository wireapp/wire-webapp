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

export interface MenuOpenButtonProps<T = HTMLDivElement> extends React.HTMLProps<T> {
  open?: boolean;
}

const menuOpenButtonStyles: (props: MenuOpenButtonProps) => ObjectInterpolation<undefined> = props => ({
  display: 'block',
  div: {
    backgroundColor: COLOR.TEXT,
    height: '2px',
    margin: '4px',
    transition: 'all 0.25s ease-in-out',
    width: '16px',
  },
  'div:nth-child(1)': {
    transform: props.open ? 'translateY(6px) rotate(-45deg)' : undefined,
  },
  'div:nth-child(2)': {
    opacity: props.open ? 0 : undefined,
    transform: props.open ? 'scale(0, 1)' : undefined,
  },
  'div:nth-child(3)': {
    transform: props.open ? 'translateY(-6px) rotate(45deg)' : undefined,
  },
  [media[QueryKeys.DESKTOP]]: {
    display: 'none',
  },
  zIndex: 2,
});

const MenuOpenButton = (props: MenuOpenButtonProps) => <div css={menuOpenButtonStyles(props)} {...props} />;

export {MenuOpenButton, menuOpenButtonStyles};
