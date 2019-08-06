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
import {filterProps} from '../util';
import {THEME_ID, Theme, ThemeProvider} from './Theme';

export interface StyledAppContainerProps<T = HTMLDivElement> extends React.HTMLProps<T> {
  backgroundColor?: string;
  themeId?: THEME_ID;
}

const styledAppContainerStyle: <T>(
  theme: Theme,
  props: StyledAppContainerProps<T>,
) => ObjectInterpolation<undefined> = (theme, {backgroundColor = theme.general.backgroundColor}) => ({
  background: backgroundColor,
  transition: 'background 0.15s',
});

const filterStyledAppContainerProps = (props: StyledAppContainerProps) =>
  filterProps(props, ['backgroundColor', 'themeId']);

const StyledAppContainer = (props: StyledAppContainerProps) => (
  <div css={theme => styledAppContainerStyle(theme, props)} {...filterStyledAppContainerProps(props)} />
);

export const StyledApp = ({themeId = THEME_ID.LIGHT, children, ...props}) => (
  <ThemeProvider themeId={themeId}>
    <StyledAppContainer {...props}>
      <GlobalStyle />
      {children}
    </StyledAppContainer>
  </ThemeProvider>
);
