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
import {TextProps} from '../../Text';
import {contentStyles} from '../Content';

export interface MenuContentProps<T = HTMLDivElement> extends TextProps<T> {
  open?: boolean;
}

const menuContentStyles: <T>(props: MenuContentProps<T>) => ObjectInterpolation<undefined> = props => ({
  ...contentStyles(props),
  alignItems: 'center',
  flexDirection: 'row',
  height: '64px',
  justifyContent: 'space-between',
  left: props.open ? 0 : undefined,
  position: props.open ? 'fixed' : undefined,
  width: props.open ? '100%' : undefined,
  zIndex: props.open ? 10000 : undefined,
});

const MenuContent = (props: MenuContentProps) => <div css={menuContentStyles(props)} {...props} />;

export {MenuContent, menuContentStyles};
