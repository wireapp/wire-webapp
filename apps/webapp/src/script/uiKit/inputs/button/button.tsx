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

import {buttonStyle} from './button.styles';
import {ButtonProps, ButtonVariant} from './button.types';

import {Loading} from '../../dataDisplay';
import {COLOR, Theme} from '../../identity';
import {filterTextProps} from '../../typography';
import {filterProps} from '../../utils';

export {ButtonVariant};
export type {ButtonProps};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({showLoading, children, loadingColor = COLOR.WHITE, ...props}, ref) => {
    return (
      <button
        ref={ref}
        css={(theme: Theme) => {
          return buttonStyle(theme, props);
        }}
        {...filterButtonProps(props)}
      >
        {showLoading === true ? (
          <Loading size={30} color={loadingColor} style={{display: 'flex', margin: 'auto'}} />
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

export const filterButtonProps = (props: ButtonProps): Object => {
  return filterProps(filterTextProps(props) as ButtonProps, ['backgroundColor', 'noCapital']);
};
