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

import {THEME_ID, Theme, ThemeProvider, themes} from './Theme';

import {GlobalStyle} from '../GlobalStyle';
import {filterProps} from '../util';

type StyledAppContainerProps =
  | {
      themeId: THEME_ID;
      theme?: never;
    }
  | {
      theme: Theme;
      themeId?: never;
    };

type BackgroundColorProps = {
  backgroundColor?: string;
};

export type StyledAppProps = React.HTMLProps<HTMLDivElement> & StyledAppContainerProps & BackgroundColorProps;

const styledAppContainerStyle: (
  theme: Theme,
  props: React.HTMLProps<HTMLDivElement> & BackgroundColorProps,
) => CSSObject = (theme, {backgroundColor = theme.general.backgroundColor}) => ({
  background: backgroundColor,
  transition: 'background 0.15s',
});

const filterStyledAppProps = (props: Partial<StyledAppProps>) =>
  filterProps(props, ['backgroundColor', 'themeId', 'theme']);

const StyledAppContainer = (props: React.HTMLProps<HTMLDivElement> & BackgroundColorProps) => (
  <div css={(theme: Theme) => styledAppContainerStyle(theme, props)} {...filterStyledAppProps(props)} />
);

export const StyledApp: React.FC<StyledAppProps> = ({themeId = THEME_ID.LIGHT, theme, children, ...props}) => (
  <ThemeProvider theme={theme ? theme : themes[themeId]}>
    <StyledAppContainer {...props}>
      <GlobalStyle />
      {children}
    </StyledAppContainer>
  </ThemeProvider>
);
