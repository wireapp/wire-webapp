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

import {CSSObject} from '@emotion/react';

import {COLOR} from './colors';

import {SVGIcon, SVGIconProps} from '../Icon/SVGIcon';
import {defaultTransition} from '../Identity/motions';
import {Theme} from '../Layout';

export interface LogoProps<T = SVGSVGElement> extends SVGIconProps<T> {
  hover?: boolean;
}

const logoStyle: <T>(theme: Theme, props: LogoProps<T>) => CSSObject = (
  theme,
  {hover, color = theme.general.color},
) => ({
  '&:hover path': {
    fill: hover ? COLOR.shade(color, 0.06) : undefined,
  },
  path: {
    fill: color,
    transition: defaultTransition,
  },
});

export const Logo = ({hover, ...props}: LogoProps) => (
  <SVGIcon realWidth={57} realHeight={18} css={(theme: Theme) => logoStyle(theme, {hover, ...props})} {...props}>
    <path d="M10.857 14.767a5.45 5.45 0 0 1-1.277-3.51l.002-8.688c0-.708.573-1.284 1.277-1.284s1.277.576 1.277 1.284l-.002 8.687a5.45 5.45 0 0 1-1.277 3.51zm9.58-3.51c0 3.01-2.409 5.458-5.402 5.458a5.413 5.413 0 0 1-3.233-1.073 6.72 6.72 0 0 0 1.61-4.386l.002-8.687A2.565 2.565 0 0 0 10.859 0a2.565 2.565 0 0 0-2.555 2.569l-.002 8.687c0 1.675.64 3.206 1.65 4.386a5.413 5.413 0 0 1-3.233 1.073c-2.993 0-5.442-2.449-5.442-5.459V.66H0v10.597C0 14.975 3.035 18 6.733 18a6.681 6.681 0 0 0 4.164-1.458A6.587 6.587 0 0 0 15.028 18c3.698 0 6.686-3.025 6.686-6.744V.66h-1.278v10.597zm5.11 6.403h1.278V.624h-1.277V17.66zM38.008.327a7.337 7.337 0 0 0-6.073 3.233V.624h-1.278V17.66h1.278V7.72c0-3.367 2.725-6.106 6.073-6.106V.327zm2.394 13.705c-2.485-2.965-2.342-7.416.432-10.208a7.478 7.478 0 0 1 10.141-.436L40.401 14.032zM52.784 3.386a8.75 8.75 0 0 0-12.854-.471c-3.424 3.446-3.424 9.054 0 12.5a8.75 8.75 0 0 0 12.417.002l-.903-.91a7.478 7.478 0 0 1-10.14.434l5.285-5.32 6.195-6.235zM53.964.77h.447v1.16h.136V.77h.45V.643h-1.033V.77zM56.34.643l-.445 1.116L55.45.643h-.21v1.286h.131V.779l.457 1.15h.124l.455-1.145v1.145h.132V.643h-.201z" />
  </SVGIcon>
);
