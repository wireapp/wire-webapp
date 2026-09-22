/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

const strokewidth = 4;
const strokelength = strokewidth * Math.PI;

export const ephemeralTimerBackgroundStyle: CSSObject = {
  fill: 'var(--app-bg-secondary)',
  stroke: 'var(--foreground)',
  strokeWidth: '1px',
};

export const ephemeralTimerDialStyle: (offset: number) => CSSObject = (offset = 1) => ({
  fill: 'none',
  stroke: 'var(--foreground)',
  strokeDasharray: strokelength,
  strokeDashoffset: `${strokelength * (1 + offset)}`,
  strokeWidth: strokewidth,
});
