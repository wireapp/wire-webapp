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
import media, {QueryKeys} from '../mediaQueries';
import {GUTTER} from './sizes';

export interface ColumnsProps<T = HTMLDivElement> extends React.HTMLProps<T> {}

const columnsStyle: (props: ColumnsProps) => ObjectInterpolation<undefined> = props => ({
  display: 'flex',
  marginLeft: `-${GUTTER}px`,
  [media[QueryKeys.MOBILE]]: {flexDirection: 'column'},
});

const Columns = (props: ColumnsProps) => <div css={columnsStyle(props)} {...props} />;

export interface ColumnProps<T = HTMLDivElement> extends React.HTMLProps<T> {}

const columnStyle: (props: ColumnProps) => ObjectInterpolation<undefined> = props => ({
  display: 'block',
  flexBasis: '0',
  flexGrow: 1,
  flexShrink: 1,
  marginLeft: `${GUTTER}px`,
});

const Column = (props: ColumnProps) => <div css={columnStyle(props)} {...props} />;

export {Column, Columns};
