/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

/* eslint-disable sort-keys, sort-vars, no-magic-numbers */

import Color from 'color';

function shade(color, percentage) {
  return Color(color)
    .mix(Color(BASE_COLOR.BLACK), percentage)
    .toString();
}

function tint(color, percentage) {
  return Color(color)
    .mix(Color(BASE_COLOR.WHITE), percentage)
    .toString();
}

function opaque(color, percentage) {
  return Color(color)
    .fade(percentage)
    .toString();
}

const BASE_COLOR = {
  BLACK: '#000',
  BLUE: '#2391d3',
  GRAY: '#8d989f',
  GREEN: '#00c800',
  ORANGE: '#ff8900',
  RED: '#fb0807',
  WHITE: '#fff',
  YELLOW: '#febf02',
};

const DARK_COLOR = {
  BLUE_DARKEN_8: shade(BASE_COLOR.BLUE, 0.08),
  BLUE_DARKEN_48: shade(BASE_COLOR.BLUE, 0.48),
  BLUE_DARKEN_72: shade(BASE_COLOR.BLUE, 0.72),
  BLUE_DARKEN_88: shade(BASE_COLOR.BLUE, 0.88),
  GRAY_DARKEN_8: shade(BASE_COLOR.GRAY, 0.08),
  GRAY_DARKEN_48: shade(BASE_COLOR.GRAY, 0.48),
  GRAY_DARKEN_72: shade(BASE_COLOR.GRAY, 0.72),
  GRAY_DARKEN_88: shade(BASE_COLOR.GRAY, 0.88),
  GREEN_DARKEN_8: shade(BASE_COLOR.GREEN, 0.08),
  GREEN_DARKEN_48: shade(BASE_COLOR.GREEN, 0.48),
  GREEN_DARKEN_72: shade(BASE_COLOR.GREEN, 0.72),
  GREEN_DARKEN_88: shade(BASE_COLOR.GREEN, 0.88),
  ORANGE_DARKEN_8: shade(BASE_COLOR.ORANGE, 0.08),
  ORANGE_DARKEN_48: shade(BASE_COLOR.ORANGE, 0.48),
  ORANGE_DARKEN_72: shade(BASE_COLOR.ORANGE, 0.72),
  ORANGE_DARKEN_88: shade(BASE_COLOR.ORANGE, 0.88),
  RED_DARKEN_8: shade(BASE_COLOR.RED, 0.08),
  RED_DARKEN_48: shade(BASE_COLOR.RED, 0.48),
  RED_DARKEN_72: shade(BASE_COLOR.RED, 0.72),
  RED_DARKEN_88: shade(BASE_COLOR.RED, 0.88),
  YELLOW_DARKEN_8: shade(BASE_COLOR.YELLOW, 0.08),
  YELLOW_DARKEN_48: shade(BASE_COLOR.YELLOW, 0.48),
  YELLOW_DARKEN_72: shade(BASE_COLOR.YELLOW, 0.72),
  YELLOW_DARKEN_88: shade(BASE_COLOR.YELLOW, 0.88),
};

const LIGHT_COLOR = {
  GRAY_LIGHTEN_24: tint(BASE_COLOR.GRAY, 0.24),
  GRAY_LIGHTEN_48: tint(BASE_COLOR.GRAY, 0.48),
  GRAY_LIGHTEN_72: tint(BASE_COLOR.GRAY, 0.72),
  GRAY_LIGHTEN_88: tint(BASE_COLOR.GRAY, 0.88),
  GRAY_LIGHTEN_92: tint(BASE_COLOR.GRAY, 0.92),
};

const OPAQUE_COLOR = {
  BLUE_OPAQUE_16: opaque(BASE_COLOR.BLUE, 0.16),
  BLUE_OPAQUE_24: opaque(BASE_COLOR.BLUE, 0.24),
  GRAY_OPAQUE_16: opaque(BASE_COLOR.GRAY, 0.16),
  GRAY_OPAQUE_24: opaque(BASE_COLOR.GRAY, 0.24),
  GREEN_OPAQUE_16: opaque(BASE_COLOR.GREEN, 0.16),
  GREEN_OPAQUE_24: opaque(BASE_COLOR.GREEN, 0.24),
  ORANGE_OPAQUE_16: opaque(BASE_COLOR.ORANGE, 0.16),
  ORANGE_OPAQUE_24: opaque(BASE_COLOR.ORANGE, 0.24),
  RED_OPAQUE_16: opaque(BASE_COLOR.RED, 0.16),
  RED_OPAQUE_24: opaque(BASE_COLOR.RED, 0.24),
  YELLOW_OPAQUE_16: opaque(BASE_COLOR.YELLOW, 0.16),
  YELLOW_OPAQUE_24: opaque(BASE_COLOR.YELLOW, 0.24),
};

export const COLOR = {
  ...BASE_COLOR,
  ...DARK_COLOR,
  ...LIGHT_COLOR,
  ...OPAQUE_COLOR,
};
