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

export const BASE_LIGHT_COLOR = {
  AMBER: '#a25915',
  BLUE: '#0667c8',
  GREEN: '#1d7833',
  PURPLE: '#8944ab',
  RED: '#c20013',
  TURQUOISE: '#01718e',
} as const;

export const BASE_DARK_COLOR = {
  AMBER: '#ffd426',
  BLUE: '#54a6ff',
  GREEN: '#30db5b',
  TURQUOISE: '#5de6ff',
  PURPLE: '#da8fff',
  RED: '#ff7770',
} as const;

const LIGHT_BLUE = {
  BLUE_LIGHT_50: '#e7f0fa',
  BLUE_LIGHT_100: '#cde1f4',
  BLUE_LIGHT_200: '#9bc2e9',
  BLUE_LIGHT_300: '#6aa4de',
  BLUE_LIGHT_400: '#3885d3',
  BLUE_LIGHT_500: BASE_LIGHT_COLOR.BLUE,
  BLUE_LIGHT_600: '#0552a0',
  BLUE_LIGHT_700: '#043e78',
  BLUE_LIGHT_800: '#022950',
  BLUE_LIGHT_900: '#19324d',
} as const;

const DARK_BLUE = {
  BLUE_DARK_50: '#eef7ff',
  BLUE_DARK_100: '#ddedff',
  BLUE_DARK_200: '#bbdbff',
  BLUE_DARK_300: '#98caff',
  BLUE_DARK_400: '#76b8ff',
  BLUE_DARK_500: BASE_DARK_COLOR.BLUE,
  BLUE_DARK_600: '#4385cc',
  BLUE_DARK_700: '#326499',
  BLUE_DARK_800: '#224266',
  BLUE_DARK_900: '#19324d',
} as const;

const LIGHT_GREEN = {
  GREEN_LIGHT_50: '#e8f1ea',
  GREEN_LIGHT_100: '#d2e4d6',
  GREEN_LIGHT_200: '#a5c9ad',
  GREEN_LIGHT_300: '#77ae85',
  GREEN_LIGHT_400: '#4a935c',
  GREEN_LIGHT_500: BASE_LIGHT_COLOR.GREEN,
  GREEN_LIGHT_600: '#176029',
  GREEN_LIGHT_700: '#11481f',
  GREEN_LIGHT_800: '#0c3014',
  GREEN_LIGHT_900: '#0e421b',
} as const;

const DARK_GREEN = {
  GREEN_DARK_50: '#ebfcef',
  GREEN_DARK_100: '#d6f8de',
  GREEN_DARK_200: '#acf1bd',
  GREEN_DARK_300: '#83e99d',
  GREEN_DARK_400: '#59e27c',
  GREEN_DARK_500: BASE_DARK_COLOR.GREEN,
  GREEN_DARK_600: '#26af49',
  GREEN_DARK_700: '#1d8337',
  GREEN_DARK_800: '#135824',
  GREEN_DARK_900: '#0e421b',
} as const;

const LIGHT_TURQUOISE = {
  TURQUOISE_LIGHT_50: '#e5f1f3',
  TURQUOISE_LIGHT_100: '#cce2e7',
  TURQUOISE_LIGHT_200: '#99c6d0',
  TURQUOISE_LIGHT_300: '#67a9b8',
  TURQUOISE_LIGHT_400: '#348da1',
  TURQUOISE_LIGHT_500: BASE_LIGHT_COLOR.TURQUOISE,
  TURQUOISE_LIGHT_600: '#015a6e',
  TURQUOISE_LIGHT_700: '#014352',
  TURQUOISE_LIGHT_800: '#002d37',
  TURQUOISE_LIGHT_900: '#1c454d',
} as const;

const DARK_TURQUOISE = {
  TURQUOISE_DARK_50: '#effdff',
  TURQUOISE_DARK_100: '#dffaff',
  TURQUOISE_DARK_200: '#bef5ff',
  TURQUOISE_DARK_300: '#9ef0ff',
  TURQUOISE_DARK_400: '#7debff',
  TURQUOISE_DARK_500: BASE_DARK_COLOR.TURQUOISE,
  TURQUOISE_DARK_600: '#4Ab8cc',
  TURQUOISE_DARK_700: '#388a99',
  TURQUOISE_DARK_800: '#255c66',
  TURQUOISE_DARK_900: '#1c454d',
} as const;

const LIGHT_PURPLE = {
  PURPLE_LIGHT_50: '#f4edf7',
  PURPLE_LIGHT_100: '#e7daee',
  PURPLE_LIGHT_200: '#d0b4dd',
  PURPLE_LIGHT_300: '#b88fcd',
  PURPLE_LIGHT_400: '#a169bc',
  PURPLE_LIGHT_500: BASE_LIGHT_COLOR.PURPLE,
  PURPLE_LIGHT_600: '#6e3689',
  PURPLE_LIGHT_700: '#522967',
  PURPLE_LIGHT_800: '#371b44',
  PURPLE_LIGHT_900: '#412b4d',
} as const;

const DARK_PURPLE = {
  PURPLE_DARK_50: '#fcf4ff',
  PURPLE_DARK_100: '#f8e9ff',
  PURPLE_DARK_200: '#f0d2ff',
  PURPLE_DARK_300: '#e9bcff',
  PURPLE_DARK_400: '#e1a5ff',
  PURPLE_DARK_500: BASE_DARK_COLOR.PURPLE,
  PURPLE_DARK_600: '#ae72cc',
  PURPLE_DARK_700: '#835699',
  PURPLE_DARK_800: '#573966',
  PURPLE_DARK_900: '#412b4d',
} as const;

const LIGHT_RED = {
  RED_LIGHT_50: '#f9e6e8',
  RED_LIGHT_100: '#f3ccd0',
  RED_LIGHT_200: '#e799a1',
  RED_LIGHT_300: '#da6671',
  RED_LIGHT_400: '#ce3342',
  RED_LIGHT_500: BASE_LIGHT_COLOR.RED,
  RED_LIGHT_600: '#9b000f',
  RED_LIGHT_700: '#74000b',
  RED_LIGHT_800: '#4e0008',
  RED_LIGHT_900: '#4d2422',
} as const;

const DARK_RED = {
  RED_DARK_50: '#fff2f1',
  RED_DARK_100: '#ffe4e2',
  RED_DARK_200: '#ffc9c6',
  RED_DARK_300: '#ffada9',
  RED_DARK_400: '#ff928d',
  RED_DARK_500: BASE_DARK_COLOR.RED,
  RED_DARK_600: '#cc5f5a',
  RED_DARK_700: '#994743',
  RED_DARK_800: '#66302d',
  RED_DARK_900: '#4d2422',
} as const;

const LIGHT_AMBER = {
  AMBER_LIGHT_50: '#f6eee8',
  AMBER_LIGHT_100: '#ecded0',
  AMBER_LIGHT_200: '#dabda1',
  AMBER_LIGHT_300: '#c79b73',
  AMBER_LIGHT_400: '#b57A44',
  AMBER_LIGHT_500: BASE_LIGHT_COLOR.AMBER,
  AMBER_LIGHT_600: '#824711',
  AMBER_LIGHT_700: '#61350d',
  AMBER_LIGHT_800: '#412408',
  AMBER_LIGHT_900: '#201204',
} as const;

const DARK_AMBER = {
  AMBER_DARK_50: '#fffbea',
  AMBER_DARK_100: '#fff6d4',
  AMBER_DARK_200: '#ffeea8',
  AMBER_DARK_300: '#ffe57d',
  AMBER_DARK_400: '#ffdd51',
  AMBER_DARK_500: BASE_DARK_COLOR.AMBER,
  AMBER_DARK_600: '#ccaa1e',
  AMBER_DARK_700: '#997f17',
  AMBER_DARK_800: '#66550f',
  AMBER_DARK_900: '#4d400b',
} as const;

const DARK = {
  ...DARK_BLUE,
  ...DARK_GREEN,
  ...DARK_TURQUOISE,
  ...DARK_PURPLE,
  ...DARK_RED,
  ...DARK_AMBER,
};

const LIGHT = {
  ...LIGHT_BLUE,
  ...LIGHT_GREEN,
  ...LIGHT_TURQUOISE,
  ...LIGHT_PURPLE,
  ...LIGHT_RED,
  ...LIGHT_AMBER,
};

const GRAYS = {
  GRAY_10: '#fafafa',
  GRAY_20: '#edeff0',
  GRAY_30: '#e5e8ea',
  GRAY_40: '#dce0e3',
  GRAY_50: '#cbced1',
  GRAY_60: '#9fa1a7',
  GRAY_70: '#676b71',
  GRAY_80: '#54585f',
  GRAY_90: '#34373d',
  GRAY_95: '#26272c',
  GRAY_100: '#17181a',
} as const;

export const COLOR_V2 = {
  ...BASE_DARK_COLOR,
  ...BASE_LIGHT_COLOR,
  ...DARK,
  ...LIGHT,
  ...GRAYS,
  BLACK: '#000',
  WHITE: '#fff',
} as const;
