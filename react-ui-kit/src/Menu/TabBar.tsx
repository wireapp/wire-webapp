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
import React from 'react';
import {COLOR} from '../Identity';
import {TextProps, textStyle} from '../Text';
import {filterProps} from '../util';

export interface TabBarProps<T = HTMLDivElement> extends React.HTMLProps<T> {}

const tabBarStyle: <T>(props: TabBarProps<T>) => ObjectInterpolation<undefined> = ({}) => {
  return {
    display: 'flex',
    width: '100%',
  };
};

const filteredTabBarProps = (props: Object) => filterProps(props, []);

const TabBar = ({children = null, ...props}: TabBarProps & React.HTMLProps<HTMLDivElement>) => (
  <div css={tabBarStyle(props)} {...filteredTabBarProps(props)}>
    {children}
  </div>
);

export interface TabBarItemProps<T = HTMLSpanElement> extends TextProps<T> {
  active: boolean;
}

const tabBarItemStyle: <T>(props: TabBarItemProps<T>) => ObjectInterpolation<undefined> = ({
  block = true,
  center = true,
  color = COLOR.TEXT,
  bold = true,
  active = false,
  fontSize = '11px',
  textTransform = 'uppercase',
  ...props
}) => {
  return {
    ...textStyle({bold, block, color, center, fontSize, textTransform, ...props}),
    borderBottom: active ? `1px solid ${COLOR.GRAY_DARKEN_48}` : 'none',
    cursor: 'pointer',
    display: 'flex',
    flexGrow: 1,
    justifyContent: 'center',
    padding: '8px 0',
  };
};

const TabBarItem = ({children = null, ...props}: TabBarItemProps) => (
  <span css={tabBarItemStyle(props)} {...props}>
    {children}
  </span>
);

export {TabBar, TabBarItem};
