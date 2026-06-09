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

import {Theme} from '../../Identity';
import {COLOR_V2} from '../../Identity/colors-v2/colors-v2';
import {QueryKeys, media, filterProps} from '../../utils';

export interface MenuOpenButtonProps<T = HTMLDivElement> extends React.HTMLProps<T> {
  open?: boolean;
  openMenuLabel?: string;
  closeMenuLabel?: string;
}

export const menuOpenButtonStyle: <T>(theme: Theme, props: MenuOpenButtonProps<T>) => CSSObject = (theme, {open}) => ({
  display: 'block',
  cursor: 'pointer',
  width: 40,
  height: 32,
  padding: '5px 8px',

  '&:focus-visible': {
    background: theme.Button?.secondaryActiveBg ?? COLOR_V2.BLUE_LIGHT_50,
    border: `1px solid ${theme.Button?.secondaryActiveBorder ?? COLOR_V2.BLUE_LIGHT_300}`,
    borderRadius: 12,
    boxShadow: `0 0 0 2px ${theme.general?.focusColor ?? COLOR_V2.BLUE_LIGHT_300}`,
    outline: 'none',
  },
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

export const MenuOpenButton = ({
  open,
  onClick,
  onKeyDown,
  openMenuLabel,
  closeMenuLabel,
  ...menuBtnProps
}: MenuOpenButtonProps) => {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={open ? closeMenuLabel : openMenuLabel}
      css={(theme: Theme) => menuOpenButtonStyle(theme, menuBtnProps)}
      onKeyDown={onKeyDown}
      onClick={onClick}
      {...filterMenuOpenButtonProps(menuBtnProps)}
    >
      <div />
      <div />
      <div />
    </div>
  );
};
