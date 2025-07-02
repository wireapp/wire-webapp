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

import {COLOR} from '../colors';
import {COLOR_V2} from '../colors-v2';

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
  '--text-input-autocomplete-background': COLOR_V2.BLUE_LIGHT_50,

  // Select
  '--select-focused-description': COLOR_V2.WHITE,

  // Range Input
  '--indicator-range-input-thumb': COLOR_V2.BLUE_LIGHT_700,
  '--indicator-range-input-track-bg': COLOR_V2.GRAY_60,

  // General
  '--danger-color': COLOR_V2.RED_LIGHT_500,
  '--success-color': COLOR_V2.GREEN_LIGHT_500,
  '--app-bg': COLOR_V2.GRAY_10,
  '--main-color': COLOR.BLACK,
  '--modal-bg': '#f8f8f8',
  '--dropdown-menu-bg': COLOR.WHITE,

  // Foreground
  '--foreground-fade-16': '#676b7129',

  // Archive File Icon
  '--archive-file-icon-bg': COLOR_V2.AMBER_LIGHT_50,
  '--archive-file-icon-stroke': COLOR_V2.AMBER_LIGHT_700,

  // Audio File Icon
  '--audio-file-icon-bg': COLOR_V2.PURPLE_DARK_50,
  '--audio-file-icon-stroke': COLOR_V2.PURPLE_DARK_700,

  // Code File Icon
  '--code-file-icon-bg': COLOR_V2.PURPLE_LIGHT_50,
  '--code-file-icon-stroke': COLOR_V2.PURPLE_LIGHT_700,

  // Document File Icon
  '--document-file-icon-bg': COLOR_V2.BLUE_LIGHT_50,
  '--document-file-icon-stroke': COLOR_V2.BLUE_LIGHT_700,

  // Image File Icon
  '--image-file-icon-bg': COLOR_V2.TURQUOISE_LIGHT_50,
  '--image-file-icon-stroke': COLOR_V2.TURQUOISE_LIGHT_700,

  // PDF File Icon
  '--pdf-file-icon-bg': COLOR_V2.RED_LIGHT_50,
  '--pdf-file-icon-stroke': COLOR_V2.RED_LIGHT_700,

  // Spreadsheet File Icon
  '--spreadsheet-file-icon-bg': COLOR_V2.GREEN_LIGHT_50,
  '--spreadsheet-file-icon-stroke': COLOR_V2.GREEN_LIGHT_700,

  // Presentation File Icon
  '--presentation-file-icon-bg': COLOR_V2.AMBER_LIGHT_50,
  '--presentation-file-icon-stroke': COLOR_V2.AMBER_LIGHT_700,

  // Video File Icon
  '--video-file-icon-bg': COLOR_V2.RED_LIGHT_50,
  '--video-file-icon-stroke': COLOR_V2.RED_LIGHT_700,

  // Text File Icon
  '--text-file-icon-bg': COLOR_V2.AMBER_LIGHT_50,
  '--text-file-icon-stroke': COLOR_V2.AMBER_LIGHT_700,

  // Other File Icon
  '--other-file-icon-bg': COLOR_V2.WHITE,
  '--other-file-icon-stroke': COLOR_V2.GRAY_70,

  // Folder Icon
  '--folder-icon-bg': COLOR_V2.BLUE_LIGHT_50,
  '--folder-icon-stroke': COLOR_V2.BLUE_LIGHT_700,

  // Multiple File Icon
  '--multiple-file-icon-bg': COLOR_V2.WHITE,
  '--multiple-file-icon-stroke': COLOR_V2.GRAY_70,

  // File Unavailable Icon
  '--unavailable-file-icon-bg': COLOR_V2.WHITE,
  '--unavailable-file-icon-stroke': COLOR_V2.GRAY_70,
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
  '--text-input-autocomplete-background': COLOR_V2.BLUE_LIGHT_900,

  // Select
  '--select-focused-description': COLOR_V2.GRAY_40,

  // Range Input
  '--indicator-range-input-thumb': COLOR_V2.BLUE_DARK_300,
  '--indicator-range-input-track-bg': COLOR_V2.GRAY_70,

  // General
  '--danger-color': COLOR_V2.RED_DARK_500,
  '--success-color': COLOR_V2.GREEN_DARK_500,
  '--app-bg': COLOR_V2.GRAY_95,
  '--main-color': COLOR.WHITE,
  '--modal-bg': '#26272c',
  '--dropdown-menu-bg': COLOR.GRAY_95,

  // Foreground
  '--foreground-fade-16': '#9fa1a729',

  // Archive File Icon
  '--archive-file-icon-bg': COLOR_V2.AMBER_DARK_50,
  '--archive-file-icon-stroke': COLOR_V2.AMBER_DARK_700,

  // Audio File Icon
  '--audio-file-icon-bg': COLOR_V2.PURPLE_DARK_50,
  '--audio-file-icon-stroke': COLOR_V2.PURPLE_DARK_700,

  // Code File Icon
  '--code-file-icon-bg': COLOR_V2.PURPLE_DARK_50,
  '--code-file-icon-stroke': COLOR_V2.PURPLE_DARK_700,

  // Document File Icon
  '--document-file-icon-bg': COLOR_V2.BLUE_DARK_50,
  '--document-file-icon-stroke': COLOR_V2.BLUE_DARK_700,

  // Image File Icon
  '--image-file-icon-bg': COLOR_V2.TURQUOISE_DARK_50,
  '--image-file-icon-stroke': COLOR_V2.TURQUOISE_DARK_700,

  // PDF File Icon
  '--pdf-file-icon-bg': COLOR_V2.RED_DARK_50,
  '--pdf-file-icon-stroke': COLOR_V2.RED_DARK_700,

  // Spreadsheet File Icon
  '--spreadsheet-file-icon-bg': COLOR_V2.GREEN_DARK_50,
  '--spreadsheet-file-icon-stroke': COLOR_V2.GREEN_DARK_700,

  // Presentation File Icon
  '--presentation-file-icon-bg': COLOR_V2.AMBER_DARK_50,
  '--presentation-file-icon-stroke': COLOR_V2.AMBER_DARK_700,

  // Video File Icon
  '--video-file-icon-bg': COLOR_V2.RED_DARK_50,
  '--video-file-icon-stroke': COLOR_V2.RED_DARK_700,

  // Text File Icon
  '--text-file-icon-bg': COLOR_V2.AMBER_DARK_50,
  '--text-file-icon-stroke': COLOR_V2.AMBER_DARK_700,

  // Other File Icon
  '--other-file-icon-bg': COLOR_V2.GRAY_95,
  '--other-file-icon-stroke': COLOR_V2.GRAY_60,

  // Folder Icon
  '--folder-icon-bg': COLOR_V2.BLUE_DARK_50,
  '--folder-icon-stroke': COLOR_V2.BLUE_DARK_700,

  // Multiple File Icon
  '--multiple-file-icon-bg': COLOR_V2.GRAY_95,
  '--multiple-file-icon-stroke': COLOR_V2.GRAY_60,

  // File Unavailable Icon
  '--unavailable-file-icon-bg': COLOR_V2.GRAY_95,
  '--unavailable-file-icon-stroke': COLOR_V2.GRAY_60,
});

const accentColors: () => CSSObject = () => ({
  '--accent-color': COLOR_V2.BLUE_LIGHT_500,
  '--accent-color-highlight': COLOR_V2.BLUE_LIGHT_50,
  '--accent-color-highlight-inversed': COLOR_V2.BLUE_LIGHT_800,
  '--accent-color-border': COLOR_V2.BLUE_LIGHT_500,
  '--accent-color-focus': COLOR_V2.BLUE_LIGHT_400,
  '--button-primary-hover': COLOR_V2.BLUE_LIGHT_600,
  '--button-primary-active': COLOR_V2.BLUE_LIGHT_700,
  '--button-primary-active-border': COLOR_V2.BLUE_LIGHT_700,
  '--button-primary-focus-border': COLOR_V2.BLUE_LIGHT_700,
  '--button-secondary-active-bg': COLOR_V2.BLUE_LIGHT_50,
  '--button-secondary-active-border': COLOR_V2.BLUE_LIGHT_500,
  '--button-secondary-hover-border': COLOR_V2.BLUE_LIGHT_500,
  '--icon-primary-active-fill': COLOR_V2.BLUE_LIGHT_500,
  '--icon-secondary-active-border': 'transparent',
  '--indicator-range-input-thumb': COLOR_V2.BLUE_LIGHT_700,
});

const zIndexes: () => CSSObject = () => ({
  '--z-index-level-0': 0,
  '--z-index-level-1': 10,
  '--z-index-level-2': 100,
  '--z-index-level-3': 1000,
  '--z-index-level-4': 10000,
  '--z-index-level-5': 100000,
  '--z-index-level-6': 1000000,
  '--z-index-level-7': 10000000,
  '--z-index-level-8': 100000000,
  '--z-index-badge': 'var(--z-index-level-2)',
  '--z-index-panel': 'var(--z-index-level-3)',
  '--z-index-bubble': 'var(--z-index-level-3)',
  '--z-index-video': 'var(--z-index-level-4)',
  '--z-index-choosescreen': 'var(--z-index-level-5)',
  '--z-index-context': 'var(--z-index-level-5)',
  '--z-index-warnings': 'var(--z-index-level-6)',
  '--z-index-modal': 'var(--z-index-level-7)',
});

export const GlobalCssVariables = {
  light,
  dark,
  accentColors,
  zIndexes,
};
