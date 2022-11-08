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

export type ContentProps<T = HTMLDivElement> = React.HTMLProps<T>;

export const contentStyle: <T>(props: ContentProps<T>) => CSSObject = _ => ({
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  padding: `0 ${GUTTER}px`,
});

export const Content = (props: ContentProps) => <div css={contentStyle(props)} {...props} />;
