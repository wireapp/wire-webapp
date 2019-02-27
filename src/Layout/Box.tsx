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
import {ObjectInterpolation, jsx} from '@emotion/core';
import React from 'react';
import {COLOR} from '../Identity';

export interface BoxProps<T = HTMLDivElement> extends React.HTMLProps<T> {}

const boxStyle: <T>(props: BoxProps<T>) => ObjectInterpolation<undefined> = props => ({
  border: `2px solid ${COLOR.GRAY_LIGHTEN_72}`,
  borderradius: '8px',
  padding: '16px 32px',
});

const Box = (props: BoxProps) => <div css={boxStyle(props)} {...props} />;

export {Box, boxStyle};
