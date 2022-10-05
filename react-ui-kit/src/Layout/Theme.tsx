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
import {jsx, ThemeProvider as EmotionThemeProvider, Theme as ETheme} from '@emotion/react';
import React from 'react';

import {COLOR} from '../Identity/colors';
import {COLOR_V2, BASE_DARK_COLOR, BASE_LIGHT_COLOR} from '../Identity/colors-v2';

export enum THEME_ID {
  DARK = 'THEME_DARK',
  LIGHT = 'THEME_LIGHT',
  DEFAULT = 'THEME_DEFAULT',
}

export interface Theme extends ETheme {
  Button?: {
    primaryBg: String;
    primaryHoverBg: String;
    primaryActiveBg: String;
    primaryActiveBorder: String;
    primaryFocusBorder: String;
    primaryDisabledBg: String;
    primaryDisabledText: String;
    tertiaryBg: String;
    tertiaryBorder: String;
    tertiaryHoverBg: String;
    tertiaryHoverBorder: String;
    tertiarydisabledBg: String;
    tertiaryDisabledBorder: String;
    tertiaryActiveBg: String;
  };
  IconButton: {
    activePrimaryBgColor: string;
    focusBorderColor: string;
    hoverPrimaryBgColor: string;
    primaryActiveFillColor: string;
    primaryBgColor: string;
    primaryBorderColor: string;
    primaryDisabledBgColor: string;
    primaryDisabledBorderColor: string;
    primaryHoverBorderColor: string;
    secondaryActiveBorderColor: string;
  };
  Checkbox: {
    background: string;
    border: string;
    borderFocused: string;
    disableBgColor: string;
    disableBorderColor: string;
    disablecheckedBgColor: string;
    invalidBorderColor: string;
  };
  general: {
    backgroundColor: string;
    color: string;
    contrastColor: String;
    dangerColor: string;
    focusColor: String;
    primaryColor: string;
  };
  Input: {
    backgroundColor: string;
    backgroundColorDisabled: string;
    placeholderColor: string;
    labelColor: string;
    borderHover: string;
  };
  Select: {
    disabledColor: string;
    contrastTextColor: string;
    borderColor: string;
    focusedDescriptionColor: string;
    optionHoverBg: string;
    selectedActiveBg: String;
  };
}

export const themes: {[themeId in THEME_ID]: Theme} = {
  [THEME_ID.DEFAULT]: {
    Button: {
      primaryBg: 'var(--accent-color)',
      primaryHoverBg: 'var(--button-primary-hover)',
      primaryActiveBg: 'var(--button-primary-active)',
      primaryActiveBorder: 'var(--button-primary-active-border)',
      primaryFocusBorder: 'var(--button-primary-focus-border)',
      primaryDisabledBg: 'var(--button-primary-disabled-bg)',
      primaryDisabledText: 'var(--button-primary-disabled-text)',
      tertiaryBg: 'var(--button-tertiary-bg)',
      tertiaryBorder: 'var(--button-tertiary-border)',
      tertiaryHoverBg: 'var(--button-tertiary-hover-bg)',
      tertiaryHoverBorder: 'var(--button-tertiary-hover-border)',
      tertiarydisabledBg: 'var(--button-tertiary-disabled-bg)',
      tertiaryDisabledBorder: 'var(--button-tertiary-disabled-border)',
      tertiaryActiveBg: 'var(--accent-color-highlight)',
    },
    Checkbox: {
      background: 'var(--checkbox-background)',
      border: 'var(--checkbox-border)',
      borderFocused: 'var(--accent-color)',
      disableBgColor: 'var(--checkbox-background-disabled)',
      disableBorderColor: 'var(--checkbox-border-disabled)',
      disablecheckedBgColor: 'var(--checkbox-background-disabled-selected)',
      invalidBorderColor: 'var(--danger-color)',
    },
    IconButton: {
      activePrimaryBgColor: 'var(--accent-color-highlight)',
      focusBorderColor: 'var(--accent-color-border)',
      hoverPrimaryBgColor: 'var(--icon-button-primary-hover-bg)',
      primaryActiveFillColor: 'var(--icon-primary-active-fill)',
      primaryBgColor: 'var(--icon-button-primary-enabled-bg)',
      primaryBorderColor: 'var(--icon-button-primary-border)',
      primaryDisabledBgColor: 'var(--icon-button-primary-disabled-bg)',
      primaryDisabledBorderColor: 'var(--icon-button-primary-disabled-border)',
      primaryHoverBorderColor: 'var(--icon-button-primary-hover-border)',
      secondaryActiveBorderColor: 'var(--icon-secondary-active-border)',
    },
    Input: {
      backgroundColor: 'var(--text-input-background)',
      backgroundColorDisabled: 'var(--text-input-disabled)',
      labelColor: 'var(--text-input-label)',
      placeholderColor: 'var(--text-input-placeholder)',
      borderHover: 'var(--text-input-border-hover)',
    },
    Select: {
      borderColor: 'var(--text-input-border)',
      contrastTextColor: 'var(--text-input-background)',
      disabledColor: 'var(--text-input-placeholder)',
      focusedDescriptionColor: 'var(--select-focused-description)',
      optionHoverBg: 'var(--accent-color-highlight)',
      selectedActiveBg: 'var(--button-primary-hover)',
    },
    general: {
      backgroundColor: 'var(--app-bg)',
      color: 'var(--main-color)',
      dangerColor: 'var(--danger-color)',
      primaryColor: 'var(--accent-color)',
      contrastColor: 'var(--text-input-background)',
      focusColor: 'var(--accent-color-focus)',
    },
  },
  [THEME_ID.LIGHT]: {
    Button: {
      primaryBg: 'var(--accent-color)',
      primaryHoverBg: 'var(--button-primary-hover)',
      primaryActiveBg: 'var(--button-primary-active)',
      primaryActiveBorder: 'var(--button-primary-active-border)',
      primaryFocusBorder: 'var(--button-primary-focus-border)',
      primaryDisabledBg: 'var(--button-primary-disabled-bg)',
      primaryDisabledText: 'var(--button-primary-disabled-text)',
      tertiaryBg: 'var(--button-tertiary-bg)',
      tertiaryBorder: 'var(--button-tertiary-border)',
      tertiaryHoverBg: 'var(--button-tertiary-hover-bg)',
      tertiaryHoverBorder: 'var(--button-tertiary-hover-border)',
      tertiarydisabledBg: 'var(--button-tertiary-disabled-bg)',
      tertiaryDisabledBorder: 'var(--button-tertiary-disabled-border)',
      tertiaryActiveBg: 'var(--accent-color-highlight)',
    },
    IconButton: {
      activePrimaryBgColor: COLOR_V2.BLUE_LIGHT_50,
      focusBorderColor: COLOR_V2.BLUE_LIGHT_500,
      hoverPrimaryBgColor: COLOR_V2.GRAY_20,
      primaryActiveFillColor: COLOR_V2.BLUE,
      primaryBgColor: COLOR_V2.WHITE,
      primaryBorderColor: COLOR_V2.GRAY_40,
      primaryDisabledBgColor: COLOR_V2.GRAY_20,
      primaryDisabledBorderColor: COLOR_V2.GRAY_40,
      primaryHoverBorderColor: COLOR_V2.GRAY_50,
      secondaryActiveBorderColor: 'transparent',
    },
    Input: {
      backgroundColor: COLOR.WHITE,
      backgroundColorDisabled: COLOR_V2.GRAY_20,
      placeholderColor: COLOR.GRAY_DARKEN_24,
      labelColor: COLOR_V2.GRAY_80,
      borderHover: 'var(--text-input-border-hover)',
    },
    general: {
      backgroundColor: COLOR_V2.GRAY_20,
      color: COLOR.TEXT,
      primaryColor: COLOR_V2.BLUE,
      dangerColor: COLOR_V2.RED,
      contrastColor: 'var(--text-input-background)',
      focusColor: 'var(--accent-color-focus)',
    },
    Select: {
      disabledColor: COLOR_V2.GRAY_70,
      contrastTextColor: COLOR.WHITE,
      borderColor: COLOR_V2.GRAY_40,
      focusedDescriptionColor: COLOR_V2.WHITE,
      optionHoverBg: 'var(--accent-color-highlight)',
      selectedActiveBg: 'var(--button-primary-hover)',
    },
    Checkbox: {
      background: COLOR_V2.GRAY_20,
      border: COLOR_V2.GRAY_80,
      borderFocused: BASE_LIGHT_COLOR.BLUE,
      disableBgColor: COLOR_V2.GRAY_20,
      disableBorderColor: COLOR_V2.GRAY_60,
      disablecheckedBgColor: COLOR_V2.GRAY_20,
      invalidBorderColor: BASE_LIGHT_COLOR.RED,
    },
  },
  [THEME_ID.DARK]: {
    Button: {
      primaryBg: 'var(--accent-color)',
      primaryHoverBg: 'var(--button-primary-hover)',
      primaryActiveBg: 'var(--button-primary-active)',
      primaryActiveBorder: 'var(--button-primary-active-border)',
      primaryFocusBorder: 'var(--button-primary-focus-border)',
      primaryDisabledBg: 'var(--button-primary-disabled-bg)',
      primaryDisabledText: 'var(--button-primary-disabled-text)',
      tertiaryBg: 'var(--button-tertiary-bg)',
      tertiaryBorder: 'var(--button-tertiary-border)',
      tertiaryHoverBg: 'var(--button-tertiary-hover-bg)',
      tertiaryHoverBorder: 'var(--button-tertiary-hover-border)',
      tertiarydisabledBg: 'var(--button-tertiary-disabled-bg)',
      tertiaryDisabledBorder: 'var(--button-tertiary-disabled-border)',
      tertiaryActiveBg: 'var(--accent-color-highlight)',
    },
    IconButton: {
      activePrimaryBgColor: COLOR_V2.BLUE_DARK_800,
      focusBorderColor: COLOR_V2.BLUE_DARK_600,
      hoverPrimaryBgColor: COLOR_V2.GRAY_80,
      primaryActiveFillColor: COLOR.WHITE,
      primaryBgColor: COLOR_V2.GRAY_90,
      primaryBorderColor: COLOR_V2.GRAY_100,
      primaryDisabledBgColor: COLOR_V2.GRAY_95,
      primaryDisabledBorderColor: COLOR_V2.GRAY_90,
      primaryHoverBorderColor: COLOR_V2.GRAY_70,
      secondaryActiveBorderColor: COLOR_V2.BLUE_DARK_800,
    },
    Input: {
      backgroundColor: COLOR.BLACK_LIGHTEN_24,
      backgroundColorDisabled: COLOR.GRAY_100,
      placeholderColor: COLOR.GRAY_LIGHTEN_88,
      labelColor: COLOR_V2.GRAY_40,
      borderHover: 'var(--text-input-border-hover)',
    },
    general: {
      backgroundColor: COLOR.BLACK,
      color: COLOR.WHITE,
      primaryColor: COLOR_V2.BLUE,
      dangerColor: COLOR_V2.RED,
      contrastColor: 'var(--text-input-background)',
      focusColor: 'var(--accent-color-focus)',
    },
    Select: {
      disabledColor: COLOR_V2.GRAY_60,
      contrastTextColor: COLOR.BLACK,
      borderColor: COLOR_V2.GRAY_90,
      focusedDescriptionColor: COLOR_V2.GRAY_40,
      optionHoverBg: 'var(--accent-color-highlight)',
      selectedActiveBg: 'var(--button-primary-active)',
    },
    Checkbox: {
      background: COLOR_V2.GRAY_20,
      border: COLOR_V2.GRAY_60,
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
  children: React.ReactNode;
}

export const ThemeProvider = (props: ThemeProps) => <EmotionThemeProvider {...props} theme={props.theme} />;
