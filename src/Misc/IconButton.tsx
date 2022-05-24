/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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
import {CSSObject, jsx} from '@emotion/react';

import {COLOR_V2} from '../Identity';
import {defaultTransition} from '../Identity/motions';
import type {Theme} from '../Layout';
import {TextProps, filterTextProps} from '../Text';
import {filterProps} from '../util';

enum IconButtonVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
}

export interface IconButtonProps<T = HTMLButtonElement> extends TextProps<T> {
  variant?: IconButtonVariant;
  backgroundColor?: string;
}

export const iconButtonStyle: <T>(theme: Theme, props: IconButtonProps<T>) => CSSObject = (
  theme,
  {variant = IconButtonVariant.PRIMARY, backgroundColor, disabled = false},
) => ({
  border: 0,
  borderRadius: '12px',
  cursor: disabled ? 'default' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '16px',
  padding: 0,
  outline: 'none',
  textDecoration: 'none',
  touchAction: 'manipulation',
  transition: defaultTransition,
  width: '40px',
  height: '32px',
  '&:hover, &:focus': {
    textDecoration: 'none',
  },
  ...(variant === IconButtonVariant.PRIMARY && {
    backgroundColor: disabled ? COLOR_V2.GRAY_20 : backgroundColor || COLOR_V2.WHITE,
    border: `1px solid ${COLOR_V2.GRAY_40}`,
    svg: {
      fill: disabled ? COLOR_V2.GRAY_70 : COLOR_V2.BLACK,
    },
    ...(!disabled && {
      '&:hover, &:focus': {
        backgroundColor: COLOR_V2.GRAY_20,
      },
      '&:hover': {
        borderColor: COLOR_V2.GRAY_50,
      },
      '&:focus': {
        borderColor: COLOR_V2.GRAY_60,
      },
      '&:active': {
        backgroundColor: COLOR_V2.BLUE_LIGHT_50,
        borderColor: COLOR_V2.BLUE_LIGHT_300,
        svg: {
          fill: COLOR_V2.BLUE,
        },
      },
    }),
  }),
  ...(variant === IconButtonVariant.SECONDARY && {
    svg: {
      fill: disabled ? COLOR_V2.GRAY_60 : COLOR_V2.BLACK,
    },
    ...(!disabled && {
      '&:hover, &:focus, &:active': {
        svg: {
          fill: COLOR_V2.BLUE,
        },
      },
      '&:focus': {
        border: `1px solid ${COLOR_V2.BLUE_LIGHT_300}`,
      },
      '&:active': {
        backgroundColor: COLOR_V2.GRAY_10,
      },
    }),
  }),
});

export const IconButton = ({children, ...props}: IconButtonProps) => (
  <button css={(theme: Theme) => iconButtonStyle(theme, props)} {...filterButtonProps(props)}>
    {children}
  </button>
);

const filterButtonProps = (props: IconButtonProps) => {
  return filterProps(filterTextProps(props) as IconButtonProps, ['backgroundColor']);
};
