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
import {LinkProps, linkStyles} from './Link';
import {TextProps, filterTextProps, textStyles} from './Text';

export interface LabelProps<T = HTMLSpanElement> extends TextProps<T> {}

const labelStyles: <T>(props: LabelProps<T>) => ObjectInterpolation<undefined> = ({
  bold = true,
  color = COLOR.LINK,
  fontSize = '12px',
  ...props
}) => ({
  ...textStyles({bold, color, fontSize, ...props}),
});

const Label = (props: LabelProps) => <span css={labelStyles(props)} {...filterTextProps(props)} />;

export interface LabelLinkProps<T = HTMLAnchorElement> extends LinkProps<T> {}

const labelLinkStyles: <T>(props: LabelLinkProps<T>) => ObjectInterpolation<undefined> = ({
  fontSize = '12px',
  ...props
}) => ({
  ...linkStyles({fontSize, ...props}),
});

const LabelLink = (props: LabelProps<HTMLAnchorElement>) => (
  <a css={labelLinkStyles(props)} {...filterTextProps(props)} />
);

export {Label, LabelLink};
