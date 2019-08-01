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
import Color from 'color';
import {COLOR} from '../Identity';
import {defaultTransition} from '../Identity/motions';
import {filterProps} from '../util';
import {TextProps, filterTextProps, textStyle} from './Text';

export interface LinkProps<T = HTMLAnchorElement> extends TextProps<T> {}

export const linkStyle: <T>(props: LinkProps<T>) => ObjectInterpolation<undefined> = ({
  bold = true,
  color = COLOR.LINK,
  fontSize = '11px',
  textTransform = 'uppercase',
  ...props
}) => {
  const darker = 0.16;
  const hoverColor = Color(color)
    .mix(Color(COLOR.BLACK), darker)
    .toString();
  return {
    ...textStyle({bold, color, fontSize, textTransform, ...props}),
    '&:hover': {
      color: hoverColor,
    },
    '&:visited, &:link, &:active': {
      color: color,
    },
    color: color,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: defaultTransition,
  };
};

export const filterLinkProps = (props: LinkProps) => filterProps(filterTextProps(props) as LinkProps, []);

export const Link = (props: LinkProps) => {
  return (
    <a css={linkStyle(props)} rel="noopener noreferrer" {...filterLinkProps(props)}>
      {props.children}
    </a>
  );
};
