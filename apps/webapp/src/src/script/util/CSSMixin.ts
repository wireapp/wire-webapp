/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {CSSObject} from '@emotion/serialize';

export const CSS_SQUARE: (size: number | string) => CSSObject = size => ({
  height: size,
  width: size,
});

export const CSS_FILL_PARENT: CSSObject = {
  bottom: 0,
  left: 0,
  position: 'absolute',
  right: 0,
  top: 0,
};

export const CSS_FLEX_CENTER: CSSObject = {
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'center',
};

export const CSS_ICON: (code: string, iconSize?: string | number) => CSSObject = (code, iconSize = '16px') => ({
  MozOsxFontSmoothing: 'grayscale',
  WebkitFontSmoothing: 'antialiased',
  content: `'${code}'`,
  fontFamily: 'Wire',
  fontSize: iconSize,
  fontStyle: 'normal',
  fontVariant: 'normal',
  fontWeight: 'normal',
  lineHeight: 1,
  speak: 'none',
  textTransform: 'none',
});

export const CSS_VISUALLY_HIDDEN: CSSObject = {
  position: 'absolute',
  left: '-10000px',
  overflow: 'hidden',
  width: '1px',
  height: '1px',
};
