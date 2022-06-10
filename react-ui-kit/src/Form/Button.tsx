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
import {CSSObject, jsx} from '@emotion/react';

import {COLOR, COLOR_V2} from '../Identity';
import {defaultTransition} from '../Identity/motions';
import type {Theme} from '../Layout';
import {Loading} from '../Misc';
import {TextProps, filterTextProps, textStyle} from '../Text';
import {filterProps} from '../util';

export enum ButtonVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TERTIARY = 'tertiary',
  SEND = 'send',
}

export interface ButtonProps<T = HTMLButtonElement> extends TextProps<T> {
  variant?: ButtonVariant;
  backgroundColor?: string;
  loadingColor?: string;
  noCapital?: boolean;
  showLoading?: boolean;
}

export const buttonStyle: <T>(theme: Theme, props: ButtonProps<T>) => CSSObject = (
  theme,
  {
    variant = ButtonVariant.PRIMARY,
    backgroundColor,
    block = false,
    disabled = false,
    noCapital = false,
    bold = true,
    center = true,
    color = COLOR.WHITE,
    fontSize = '16px',
    noWrap = true,
    textTransform = 'none',
    truncate = true,
    ...props
  },
) => ({
  ...textStyle(theme, {
    block,
    bold,
    center,
    disabled,
    fontSize,
    noWrap,
    textTransform,
    truncate,
    ...props,
  }),
  border: 0,
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
  width: block ? '100%' : 'auto',
  '&:hover, &:focus': {
    textDecoration: 'none',
  },
  ...(variant !== ButtonVariant.TERTIARY && {
    borderRadius: variant === ButtonVariant.SEND ? '100%' : '16px',
    height: variant === ButtonVariant.SEND ? '40px' : '48px',
    lineHeight: variant === ButtonVariant.SEND ? '40px' : '48px',
    ...(variant !== ButtonVariant.SEND && {
      maxWidth: '100%',
      minWidth: '125px',
      padding: '0 16px',
    }),
  }),
  ...(variant === ButtonVariant.PRIMARY && {
    backgroundColor: backgroundColor || disabled ? COLOR_V2.GRAY_50 : COLOR_V2.BLUE,
    color: disabled ? COLOR_V2.GRAY_80 : COLOR_V2.WHITE,
    ...(!disabled && {
      '&:hover, &:focus': {
        backgroundColor: COLOR_V2.BLUE_LIGHT_600,
      },
      '&:focus': {
        border: `1px solid ${COLOR_V2.BLUE_LIGHT_700}`,
      },
      '&:active': {
        backgroundColor: COLOR_V2.BLUE_LIGHT_700,
      },
    }),
  }),
  ...(variant === ButtonVariant.SECONDARY && {
    backgroundColor: backgroundColor || disabled ? COLOR_V2.GRAY_20 : COLOR_V2.WHITE,
    border: `1px solid ${COLOR_V2.GRAY_40}`,
    color: disabled ? COLOR_V2.GRAY_60 : COLOR_V2.BLACK,
    ...(!disabled && {
      '&:hover, &:focus': {
        border: `1px solid ${COLOR_V2.BLUE}`,
      },
      '&:focus': {
        color: COLOR_V2.BLUE,
      },
      '&:active': {
        backgroundColor: COLOR_V2.BLUE_LIGHT_50,
        border: `1px solid ${COLOR_V2.BLUE}`,
        color: COLOR_V2.BLUE,
      },
    }),
  }),
  ...(variant === ButtonVariant.TERTIARY && {
    color: disabled ? COLOR_V2.GRAY_60 : COLOR_V2.BLACK,
    lineHeight: '24px',
    ...(!disabled && {
      '&:hover, &:focus': {
        color: COLOR_V2.BLUE,
      },
      '&:focus': {
        border: `1px solid ${COLOR_V2.BLUE_LIGHT_300}`,
      },
    }),
  }),
  ...(variant === ButtonVariant.SEND && {
    backgroundColor: backgroundColor || disabled ? COLOR_V2.GRAY_70 : COLOR_V2.BLUE,
    width: '40px',
    ...(!disabled && {
      '&:hover, &:focus': {
        backgroundColor: COLOR_V2.BLUE_LIGHT_600,
      },
      '&:focus': {
        border: `1px solid ${COLOR_V2.BLUE_LIGHT_800}`,
      },
      '&:active': {
        backgroundColor: COLOR_V2.BLUE_LIGHT_700,
      },
    }),
  }),
});

export const Button = ({showLoading, children, loadingColor = COLOR.WHITE, ...props}: ButtonProps) => (
  <button css={(theme: Theme) => buttonStyle(theme, props)} {...filterButtonProps(props)}>
    {showLoading ? <Loading size={30} color={loadingColor} style={{display: 'flex', margin: 'auto'}} /> : children}
  </button>
);

export const filterButtonProps = (props: ButtonProps) => {
  return filterProps(filterTextProps(props) as ButtonProps, ['backgroundColor', 'noCapital']);
};
