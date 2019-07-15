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
import React from 'react';
import {COLOR} from '../Identity/colors';

export interface InternalSVGIconProps<T = SVGSVGElement> extends SVGIconProps<T> {
  realWidth: number;
  realHeight: number;
}

export interface SVGIconProps<T = SVGSVGElement> extends React.SVGProps<T> {
  color?: string;
  height?: number;
  scale?: number;
  width?: number;
  shadow?: boolean;
}

export const SVGIcon = ({
  realWidth,
  realHeight,
  scale = 1,
  width = null,
  height = null,
  color = COLOR.ICON,
  shadow,
  children,
  ...props
}: InternalSVGIconProps) => {
  let newScale = scale;
  if (width || height) {
    const widthScale = width ? width / realWidth : Infinity;
    const heightScale = height ? height / realHeight : Infinity;
    newScale = Math.min(widthScale, heightScale);
  }
  const newWidth = Math.ceil(realWidth * newScale);
  const newHeight = Math.ceil(realHeight * newScale);
  const shadowId = shadow && Math.random().toString();
  return (
    <svg
      style={{overflow: 'visible'}}
      fill={color}
      viewBox={`0 0 ${realWidth} ${realHeight}`}
      width={newWidth}
      height={newHeight}
      {...props}
    >
      {shadow && (
        <defs>
          <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
            <feOffset result="offOut" in="SourceAlpha" dx="0" dy="0" />
            <feGaussianBlur result="blurOut" in="offOut" stdDeviation="2.2" />
            <feBlend in="SourceGraphic" in2="blurOut" mode="normal" />
          </filter>
        </defs>
      )}
      <g filter={shadow && `url(#${shadowId})`}>{children}</g>
    </svg>
  );
};
