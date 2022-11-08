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

import * as React from 'react';

import {CSSObject} from '@emotion/react';

import {COLOR} from '../Identity';
import {GUTTER} from '../Layout/sizes';

export interface LineProps<T = HTMLHRElement> extends React.HTMLProps<T> {
  color?: string;
}

export const lineStyle: <T>(props: LineProps<T>) => CSSObject = ({color = COLOR.GRAY_LIGHTEN_72}) => ({
  border: 'none',
  borderBottom: `1px solid ${color}`,
  marginBottom: `${GUTTER}px`,
  marginTop: `${GUTTER}px`,
});

export const Line = (props: LineProps) => <hr css={lineStyle(props)} {...props} />;
