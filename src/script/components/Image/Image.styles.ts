/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

export const imageWrapperStyle = {
  width: '100%',
};

export function getImageStyle(sizes: {ratio: number; width: string} | undefined, interactive: boolean): CSSObject {
  return {
    aspectRatio: `${sizes?.ratio}`,
    maxWidth: '100%',
    maxHeight: '100%',
    width: sizes?.width,
    cursor: interactive ? 'pointer' : 'default',
    objectFit: 'contain',
    objectPosition: 'left',
  };
}
