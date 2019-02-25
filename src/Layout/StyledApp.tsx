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
import {GlobalStyle} from '../GlobalStyle';
import {COLOR} from '../Identity';
import {filterProps} from '../util';

export interface StyledAppContainerProps<T = HTMLDivElement> extends React.HTMLProps<T> {
  backgroundColor?: string;
}

const StyledAppContainerStyles: (props: StyledAppContainerProps) => ObjectInterpolation<undefined> = ({
  backgroundColor = COLOR.GRAY_LIGHTEN_88,
}) => ({
  '*': {
    boxSizing: 'border-box',
  },
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
});

const filterStyledAppContainerProps = (props: Object) => filterProps(props, ['backgroundColor']);

const StyledAppContainer = (props: StyledAppContainerProps) => (
  <div css={StyledAppContainerStyles(props)} {...filterStyledAppContainerProps(props)} />
);

const StyledApp = ({children, ...props}) => (
  <StyledAppContainer {...props}>
    <GlobalStyle />
    {children}
  </StyledAppContainer>
);

export {StyledApp};
