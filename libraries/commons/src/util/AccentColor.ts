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

import * as RandomUtil from './RandomUtil';

export enum AccentColorID {
  BRIGHT_ORANGE = 5,
  SOFT_PINK = 6,
  STRONG_BLUE = 1,
  STRONG_LIME_GREEN = 2,
  VIOLET = 7,
  VIVID_RED = 4,
  /** @deprecated */
  YELLOW = 3,
}

export interface AccentColor {
  color: string;
  id: AccentColorID;
  name: string;
}

export const STRONG_BLUE: AccentColor = {
  color: '#2391d3',
  id: AccentColorID.STRONG_BLUE,
  name: 'StrongBlue',
};

export const STRONG_LIME_GREEN: AccentColor = {
  color: '#00c800',
  id: AccentColorID.STRONG_LIME_GREEN,
  name: 'StrongLimeGreen',
};

export const DEPRECATED_YELLOW: AccentColor = {
  color: '#febf02',
  id: AccentColorID.YELLOW,
  name: 'Yellow',
};

export const VIVID_RED: AccentColor = {
  color: '#fb0807',
  id: AccentColorID.VIVID_RED,
  name: 'VividRed',
};

export const BRIGHT_ORANGE: AccentColor = {
  color: '#ff8900',
  id: AccentColorID.BRIGHT_ORANGE,
  name: 'BrightOrange',
};

export const SOFT_PINK: AccentColor = {
  color: '#fe5ebd',
  id: AccentColorID.SOFT_PINK,
  name: 'SoftPink',
};

export const VIOLET: AccentColor = {
  color: '#9c00fe',
  id: AccentColorID.VIOLET,
  name: 'Violet',
};

export const ACCENT_COLORS: AccentColor[] = [
  BRIGHT_ORANGE,
  SOFT_PINK,
  STRONG_BLUE,
  STRONG_LIME_GREEN,
  VIOLET,
  VIVID_RED,
];

export const getById = (id: number): AccentColor | undefined => ACCENT_COLORS.find(color => color.id === id);
export const getRandom = (): AccentColor => RandomUtil.randomArrayElement(ACCENT_COLORS);

/**
 * Use with caution:
 * This only exists to support deprecated color schemes and
 * is only permitted for usage in a read only manner.
 */
export const DEPRECATED_ACCENT_COLORS: AccentColor[] = [
  BRIGHT_ORANGE,
  DEPRECATED_YELLOW,
  SOFT_PINK,
  STRONG_BLUE,
  STRONG_LIME_GREEN,
  VIOLET,
  VIVID_RED,
];

/**
 * Use with caution:
 * This only exists to support deprecated color schemes and
 * is only permitted for usage in a read only manner.
 *
 * @param id AccentColor ID
 * @returns AccentColor with given ID | undefined
 */
export const DEPRECATED_getById = (id: number): AccentColor | undefined =>
  DEPRECATED_ACCENT_COLORS.find(color => color.id === id);
