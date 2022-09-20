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
import React from 'react';

import {COLOR} from '../Identity';
import {Theme} from '../Layout';
import {TextProps, textStyle} from '../Text';
import {filterProps} from '../util';

export type TabBarProps<T = HTMLDivElement> = React.HTMLProps<T>;

const tabBarStyle: <T>(props: TabBarProps<T>) => CSSObject = ({}) => {
  return {
    display: 'flex',
    width: '100%',
  };
};

const filteredTabBarProps = (props: TabBarProps) => filterProps(props, []);

export const TabBar = ({children = null, ...props}: TabBarProps) => (
  <div css={tabBarStyle(props)} {...filteredTabBarProps(props)}>
    {children}
  </div>
);

export interface TabBarItemProps<T = HTMLSpanElement> extends TextProps<T> {
  active: boolean;
}

const tabBarItemStyle: <T>(theme: Theme, props: TabBarItemProps<T>) => CSSObject = (
  theme,
  {
    block = true,
    center = true,
    color = theme.general.color,
    bold = true,
    active = false,
    fontSize = '11px',
    textTransform = 'uppercase',
    ...props
  },
) => {
  return {
    ...textStyle(theme, {block, bold, center, color, fontSize, textTransform, ...props}),
    borderBottom: active ? `1px solid ${COLOR.GRAY_DARKEN_48}` : `1px solid ${COLOR.GRAY_LIGHTEN_40}`,
    cursor: 'pointer',
    display: 'flex',
    flexGrow: 1,
    justifyContent: 'center',
    opacity: active ? 1 : 0.56,
    padding: '8px 0',
  };
};

export const TabBarItem = ({children = null, ...props}: TabBarItemProps) => (
  <span css={(theme: Theme) => tabBarItemStyle(theme, props)} {...props}>
    {children}
  </span>
);
