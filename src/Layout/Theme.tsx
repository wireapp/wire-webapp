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
import {jsx} from '@emotion/core';
import {ThemeProvider as EmotionThemeProvider} from 'emotion-theming';
import {COLOR} from '../Identity/colors';
import {filterProps} from '../util';

export enum THEME_ID {
  LIGHT = 'THEME_LIGHT',
  DARK = 'THEME_DARK',
}

export interface Theme {
  Input: {
    placeholderColor: string;
    backgroundColor: string;
  };
  general: {
    backgroundColor: string;
    color: string;
  };
}

export const themes: {[themeId in THEME_ID]: Theme} = {
  [THEME_ID.LIGHT]: {
    Input: {
      backgroundColor: COLOR.WHITE,
      placeholderColor: COLOR.GRAY_DARKEN_24,
    },
    general: {
      backgroundColor: COLOR.GRAY_LIGHTEN_88,
      color: COLOR.TEXT,
    },
  },
  [THEME_ID.DARK]: {
    Input: {
      backgroundColor: COLOR.BLACK_LIGHTEN_24,
      placeholderColor: COLOR.GRAY_LIGHTEN_88,
    },
    general: {
      backgroundColor: COLOR.BLACK,
      color: COLOR.WHITE,
    },
  },
};

export interface ThemeProps<T = HTMLDivElement> extends React.HTMLProps<T> {
  themeId: THEME_ID;
}

const filterThemeProps = (props: ThemeProps) => filterProps(props, ['themeId']);

export const ThemeProvider = (props: ThemeProps) => (
  <EmotionThemeProvider theme={themes[props.themeId]} {...filterThemeProps(props)} />
);
