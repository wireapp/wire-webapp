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
import {jsx, ThemeProvider as EmotionThemeProvider} from '@emotion/react';
import React from 'react';

import {COLOR} from '../Identity/colors';
import {COLOR_V2, BASE_DARK_COLOR, BASE_LIGHT_COLOR} from '../Identity/colors-v2';
import {filterProps} from '../util';

export enum THEME_ID {
  DARK = 'THEME_DARK',
  LIGHT = 'THEME_LIGHT',
}

export interface Theme {
  general: {
    backgroundColor: string;
    color: string;
    dangerColor?: string;
    primaryColor?: string;
  };
  Input: {
    backgroundColor: string;
    backgroundColorDisabled: string;
    placeholderColor: string;
    labelColor: string;
  };
  select: {
    disabledColor?: string;
    contrastTextColor?: string;
    borderColor?: string;
  };
  checkbox: {
    background?: string;
    border?: string;
    borderFocused?: string;
    disableBgColor?: string;
    disableBorderColor?: string;
    disablecheckedBgColor?: string;
    invalidBorderColor?: string;
  };
}

export const themes: {[themeId in THEME_ID]: Theme} = {
  [THEME_ID.LIGHT]: {
    Input: {
      backgroundColor: COLOR.WHITE,
      backgroundColorDisabled: COLOR_V2.GRAY_20,
      placeholderColor: COLOR.GRAY_DARKEN_24,
      labelColor: COLOR_V2.GRAY_80,
    },
    general: {
      backgroundColor: COLOR.GRAY_LIGHTEN_88,
      color: COLOR.TEXT,
      primaryColor: COLOR_V2.BLUE,
      dangerColor: COLOR_V2.RED,
    },
    select: {
      disabledColor: COLOR_V2.GRAY_70,
      contrastTextColor: COLOR.WHITE,
      borderColor: COLOR_V2.GRAY_40,
    },
    checkbox: {
      background: COLOR_V2.GRAY_20,
      border: COLOR_V2.GRAY_20,
      borderFocused: BASE_LIGHT_COLOR.BLUE,
      disableBgColor: COLOR_V2.GRAY_20,
      disableBorderColor: COLOR_V2.GRAY_60,
      disablecheckedBgColor: COLOR_V2.GRAY_20,
      invalidBorderColor: BASE_LIGHT_COLOR.RED,
    },
  },
  [THEME_ID.DARK]: {
    Input: {
      backgroundColor: COLOR.BLACK_LIGHTEN_24,
      backgroundColorDisabled: COLOR.GRAY_100,
      placeholderColor: COLOR.GRAY_LIGHTEN_88,
      labelColor: COLOR_V2.GRAY_40,
    },
    general: {
      backgroundColor: COLOR.BLACK,
      color: COLOR.WHITE,
      primaryColor: COLOR_V2.BLUE,
      dangerColor: COLOR_V2.RED,
    },
    select: {
      disabledColor: COLOR_V2.GRAY_60,
      contrastTextColor: COLOR.BLACK,
      borderColor: COLOR_V2.GRAY_90,
    },
    checkbox: {
      background: COLOR_V2.GRAY_20,
      border: COLOR_V2.GRAY_80,
      borderFocused: BASE_DARK_COLOR.BLUE,
      disableBgColor: COLOR_V2.GRAY_10,
      disableBorderColor: COLOR_V2.GRAY_70,
      disablecheckedBgColor: COLOR_V2.GRAY_60,
      invalidBorderColor: BASE_DARK_COLOR.RED,
    },
  },
};

export interface ThemeProps<T = HTMLDivElement> extends React.HTMLProps<T> {
  theme?: Theme;
}

const filterThemeProps = (props: ThemeProps) => filterProps(props, ['theme']);

export const ThemeProvider = (props: ThemeProps) => (
  <EmotionThemeProvider theme={props.theme} {...filterThemeProps(props)} />
);
