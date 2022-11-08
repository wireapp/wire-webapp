/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {CSSObject} from '@emotion/react';

import {COLOR, COLOR_V2} from './Identity';

const light: () => CSSObject = () => ({
  // Checkbox
  '--checkbox-background': COLOR_V2.GRAY_20,
  '--checkbox-background-disabled': COLOR_V2.GRAY_10,
  '--checkbox-background-disabled-selected': COLOR_V2.GRAY_60,
  '--checkbox-border': COLOR_V2.GRAY_80,
  '--checkbox-border-disabled': COLOR_V2.GRAY_70,

  // Icon Button
  '--icon-button-primary-enabled-bg': COLOR.WHITE,
  '--icon-button-primary-hover-bg': COLOR_V2.GRAY_20,
  '--icon-button-primary-border': COLOR_V2.GRAY_40,
  '--icon-button-primary-disabled-bg': COLOR_V2.GRAY_20,
  '--icon-button-primary-disabled-border': COLOR_V2.GRAY_40,
  '--icon-button-primary-hover-border': COLOR_V2.GRAY_50,

  // Button
  '--button-primary-disabled-bg': COLOR_V2.GRAY_50,
  '--button-primary-disabled-text': COLOR_V2.GRAY_80,

  '--button-tertiary-bg': COLOR.WHITE,
  '--button-tertiary-border': COLOR_V2.GRAY_40,
  '--button-tertiary-hover-bg': COLOR_V2.GRAY_20,
  '--button-tertiary-hover-border': COLOR_V2.GRAY_50,
  '--button-tertiary-disabled-bg': COLOR_V2.GRAY_20,
  '--button-tertiary-disabled-border': 'transparent',

  // Inputs
  '--text-input-background': COLOR.WHITE,
  '--text-input-border': COLOR_V2.GRAY_40,
  '--text-input-border-hover': COLOR_V2.GRAY_60,
  '--text-input-placeholder': COLOR_V2.GRAY_70,
  '--text-input-disabled': COLOR_V2.GRAY_20,
  '--text-input-label': COLOR_V2.GRAY_80,

  // Select
  '--select-focused-description': COLOR_V2.WHITE,

  // General
  '--danger-color': COLOR_V2.RED_LIGHT_500,
  '--app-bg': COLOR_V2.GRAY_10,
  '--main-color': COLOR.BLACK,
});

const dark: () => CSSObject = () => ({
  // Checkbox
  '--checkbox-background': COLOR_V2.GRAY_90,
  '--checkbox-background-disabled': COLOR_V2.GRAY_90,
  '--checkbox-background-disabled-selected': COLOR_V2.GRAY_80,
  '--checkbox-border': COLOR_V2.GRAY_60,
  '--checkbox-border-disabled': COLOR_V2.GRAY_60,

  // Icon Button
  '--icon-button-primary-enabled-bg': COLOR_V2.GRAY_90,
  '--icon-button-primary-hover-bg': COLOR_V2.GRAY_80,
  '--icon-button-primary-border': COLOR_V2.GRAY_100,
  '--icon-button-primary-disabled-bg': COLOR_V2.GRAY_95,
  '--icon-button-primary-disabled-border': COLOR_V2.GRAY_90,
  '--icon-button-primary-hover-border': COLOR_V2.GRAY_70,

  // Button
  '--button-primary-disabled-bg': COLOR_V2.GRAY_70,
  '--button-primary-disabled-text': COLOR.BLACK,

  '--button-tertiary-bg': COLOR_V2.GRAY_90,
  '--button-tertiary-border': COLOR_V2.GRAY_100,
  '--button-tertiary-hover-bg': COLOR_V2.GRAY_80,
  '--button-tertiary-hover-border': COLOR_V2.GRAY_80,
  '--button-tertiary-disabled-bg': COLOR_V2.GRAY_95,
  '--button-tertiary-disabled-border': 'transparent',

  // Inputs
  '--text-input-background': COLOR.BLACK,
  '--text-input-border': COLOR_V2.GRAY_80,
  '--text-input-border-hover': COLOR_V2.GRAY_40,
  '--text-input-placeholder': COLOR_V2.GRAY_60,
  '--text-input-disabled': COLOR_V2.GRAY_100,
  '--text-input-label': COLOR_V2.GRAY_40,

  // Select
  '--select-focused-description': COLOR_V2.GRAY_40,

  // General
  '--danger-color': COLOR_V2.RED_DARK_500,
  '--app-bg': COLOR_V2.GRAY_95,
  '--main-color': COLOR.WHITE,
});

const accentColors: () => CSSObject = () => ({
  '--accent-color': COLOR_V2.BLUE_LIGHT_500,
  '--accent-color-highlight': COLOR_V2.BLUE_LIGHT_50,
  '--accent-color-highlight-inversed': COLOR_V2.BLUE_LIGHT_800,
  '--accent-color-border': COLOR_V2.BLUE_LIGHT_500,
  '--accent-color-focus': COLOR_V2.BLUE_LIGHT_400,
  '--icon-primary-active-fill': COLOR_V2.BLUE_LIGHT_500,
  '--icon-secondary-active-border': 'transparent',
  '--button-primary-hover': COLOR_V2.BLUE_LIGHT_600,
  '--button-primary-active': COLOR_V2.BLUE_LIGHT_700,
  '--button-primary-active-border': COLOR_V2.BLUE_LIGHT_700,
  '--button-primary-focus-border': COLOR_V2.BLUE_LIGHT_700,
  '--button-secondary-active-bg)': COLOR_V2.BLUE_LIGHT_50,
  '--button-secondary-active-border)': COLOR_V2.BLUE_LIGHT_500,
  '--button-secondary-hover-border)': COLOR_V2.BLUE_LIGHT_500,
});

export const GlobalCssVariables = {
  light,
  dark,
  accentColors,
};
