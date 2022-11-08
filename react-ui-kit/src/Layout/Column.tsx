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

import {GUTTER} from './sizes';

import {QueryKeys, media} from '../mediaQueries';
import {filterProps} from '../util';

export interface ColumnsProps<T = HTMLDivElement> extends React.HTMLProps<T> {
  query?: QueryKeys;
}

export const filterColumnsProps = (props: ColumnsProps) => {
  return filterProps(props, ['query']);
};

const columnsStyle: <T>(props: ColumnsProps<T>) => CSSObject = ({query = QueryKeys.MOBILE}) => ({
  display: 'flex',
  marginLeft: `-${GUTTER}px`,
  [media[query]]: {flexDirection: 'column'},
});

export const Columns = (props: ColumnsProps) => <div css={columnsStyle(props)} {...filterColumnsProps(props)} />;

export type ColumnProps<T = HTMLDivElement> = React.HTMLProps<T>;

const columnStyle: <T>(props: ColumnProps<T>) => CSSObject = _ => ({
  display: 'block',
  flexBasis: '0',
  flexGrow: 1,
  flexShrink: 1,
  marginLeft: `${GUTTER}px`,
});

export const Column = (props: ColumnProps) => <div css={columnStyle(props)} {...props} />;
