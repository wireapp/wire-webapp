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
import {GlobalStyle} from '../GlobalStyle';
import {COLOR} from '../Identity';
import {defaultTransition} from '../Identity/motions';
import {filterProps} from '../util';

export interface StyledAppContainerProps<T = HTMLDivElement> extends React.HTMLProps<T> {
  backgroundColor?: string;
}

const StyledAppContainerStyle: <T>(props: StyledAppContainerProps<T>) => ObjectInterpolation<undefined> = ({
  backgroundColor = COLOR.GRAY_LIGHTEN_88,
}) => ({
  MozOsxFontSmoothing: 'grayscale',
  WebkitFontSmoothing: 'antialiased',
  backgroundColor: backgroundColor,
  color: COLOR.TEXT,
  display: 'flex',
  flexDirection: 'column',
  fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Helvetica, Arial, sans-serif',
  fontWeight: 300,
  lineHeight: 1.5,
  minHeight: '100vh',

  '*': {
    boxSizing: 'border-box',
  },
  a: {
    color: COLOR.LINK,
    fontWeight: 400,
    textDecoration: 'none',
    transition: defaultTransition,

    '&:hover': {
      color: Color(COLOR.LINK)
        .mix(Color(COLOR.BLACK), 0.16)
        .toString(),
      cursor: 'pointer',
    },
    '&:visited,&:link,&:active': {
      color: COLOR.LINK,
    },
  },
  'b, strong': {
    fontWeight: 600,
  },
});

const filterStyledAppContainerProps = (props: Object) => filterProps(props, ['backgroundColor']);

const StyledAppContainer = (props: StyledAppContainerProps) => (
  <div css={StyledAppContainerStyle(props)} {...filterStyledAppContainerProps(props)} />
);

const StyledApp = ({children, ...props}) => (
  <StyledAppContainer {...props}>
    <GlobalStyle />
    {children}
  </StyledAppContainer>
);

export {StyledApp};
