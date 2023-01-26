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

import {COLOR_V2} from '../Identity';
import {Theme} from '../Layout';
import {manySelectors} from '../util';

export const rangeInputWrapperStyles: CSSObject = {
  position: 'relative',
  marginTop: '19px',
};

const thumbSelectors = ['&::-webkit-slider-thumb', '&::-moz-range-thumb', '&::-ms-thumb'];
const sliderSelectors = ['&::-webkit-slider-runnable-track', '&::-moz-range-track', '&::-ms-track'];

export const getImageCropZoomInputStyles = (theme: Theme, backgroundSize: `${number}% ${number}%`): CSSObject => ({
  display: 'block',
  '-webkit-appearance': 'none',
  width: '100%',
  height: '8px',
  background: COLOR_V2.GRAY_60,
  borderRadius: '4px',
  backgroundImage: `linear-gradient(${theme.general.primaryColor}, ${theme.general.primaryColor})`,
  backgroundSize: backgroundSize || '0% 100%',
  backgroundRepeat: 'no-repeat',

  ...manySelectors(thumbSelectors, {
    '-webkit-appearance': 'none',
    height: '18px',
    width: '18px',
    borderRadius: '50%',
    background: COLOR_V2.GRAY_80,
    cursor: 'pointer',
    border: 'none',
    boxShadow: 'none',
  }),

  ...manySelectors(sliderSelectors, {
    '-webkit-appearance': 'none',
    boxShadow: 'none',
    border: 'none',
    background: 'transparent',
  }),
});

export enum ValueLabelPosition {
  LEFT = 'left',
  RIGHT = 'right',
}

export const getValueLabelStyles = (theme: Theme, position: ValueLabelPosition): CSSObject => ({
  pointerEvents: 'none',
  bottom: '100%',
  fontSize: theme.fontSizes.base,
  fontWeight: 400,
  position: 'absolute',
  [position]: '4px',
});
