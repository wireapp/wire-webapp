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
import {COLOR} from '../Identity';
import {TextProps, filterTextProps, textStyles} from './Text';

export interface TitleProps<T = HTMLDivElement> extends TextProps<T> {}

const titleStyles: <T>(props: TitleProps<T>) => ObjectInterpolation<undefined> = ({
  block = true,
  center = true,
  fontSize = '32px',
  color = COLOR.GRAY,
  bold = true,
  ...props
}) => ({
  ...textStyles({bold, block, color, center, fontSize, ...props}),
  marginBottom: '8px',
});

const Title = (props: TitleProps) => <div css={titleStyles(props)} {...filterTextProps(props)} />;

export {Title};
