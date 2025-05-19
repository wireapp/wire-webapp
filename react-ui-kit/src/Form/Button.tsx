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

import {forwardRef} from 'react';

import {buttonStyle} from './Button.styles';

import {COLOR} from '../Identity';
import {Theme} from '../Layout';
import {Loading} from '../Misc';
import {TextProps, filterTextProps} from '../Text';
import {filterProps} from '../util';

export enum ButtonVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TERTIARY = 'tertiary',
  QUATERNARY = 'quaternary',
  SEND = 'send',
  CANCEL = 'cancel',
}

export interface ButtonProps<T = HTMLButtonElement> extends TextProps<T> {
  variant?: ButtonVariant;
  group?: boolean;
  backgroundColor?: string;
  loadingColor?: string;
  noCapital?: boolean;
  showLoading?: boolean;
  isActive?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({showLoading, children, loadingColor = COLOR.WHITE, ...props}, ref) => (
    <button ref={ref} css={(theme: Theme) => buttonStyle(theme, props)} {...filterButtonProps(props)}>
      {showLoading ? <Loading size={30} color={loadingColor} style={{display: 'flex', margin: 'auto'}} /> : children}
    </button>
  ),
);

Button.displayName = 'Button';

export const filterButtonProps = (props: ButtonProps) => {
  return filterProps(filterTextProps(props) as ButtonProps, ['backgroundColor', 'noCapital']);
};
