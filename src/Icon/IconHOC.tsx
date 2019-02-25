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

/** @jsx jsx */
import {jsx} from '@emotion/core';
import {COLOR} from '../Identity/colors';

export interface IconHOCProps<T = SVGSVGElement> extends React.SVGProps<T> {
  color?: string;
  height?: number;
  scale?: number;
  width?: number;
}

function IconHOC<T>(svgBody, realWidth = 0, realHeight = 0) {
  function wrapper<T>({color = COLOR.ICON, scale = 1, width = null, height = null, ...props}) {
    let newScale = scale;
    if (width || height) {
      const widthScale = width ? width / realWidth : Infinity;
      const heightScale = height ? height / realHeight : Infinity;
      newScale = Math.min(widthScale, heightScale);
    }
    const newWidth = Math.ceil(realWidth * newScale);
    const newHeight = Math.ceil(realHeight * newScale);
    return (
      <svg width={newWidth} height={newHeight} fill={color} viewBox={`0 0 ${realWidth} ${realHeight}`} {...props}>
        {typeof svgBody === 'function' ? svgBody(props) : svgBody}
      </svg>
    ) as any;
  }

  return wrapper;
}

export default IconHOC;
