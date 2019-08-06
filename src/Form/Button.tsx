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
import {defaultTransition} from '../Identity/motions';
import {Theme} from '../Layout';
import {Loading} from '../Misc';
import {TextProps, filterTextProps, textStyle} from '../Text';
import {filterProps} from '../util';

export interface ButtonProps<T = HTMLButtonElement> extends TextProps<T> {
  backgroundColor?: string;
  noCapital?: boolean;
  showLoading?: boolean;
  loadingColor?: string;
}

export const buttonStyle: <T>(theme: Theme, props: ButtonProps<T>) => ObjectInterpolation<undefined> = (
  theme,
  {
    backgroundColor = COLOR.BLUE,
    block = false,
    disabled = false,
    noCapital = false,
    bold = true,
    center = true,
    color = COLOR.WHITE,
    fontSize = '16px',
    noWrap = true,
    textTransform = 'uppercase',
    truncate = true,
    ...props
  },
) => ({
  ...textStyle(theme, {
    block,
    bold,
    center,
    color,
    disabled,
    fontSize,
    noWrap,
    textTransform,
    truncate,
    ...props,
  }),
  '&:hover, &:focus': {
    backgroundColor: disabled ? backgroundColor : COLOR.shade(backgroundColor, 0.06),
    textDecoration: 'none',
  },
  backgroundColor: backgroundColor,
  border: 0,
  borderRadius: '8px',
  cursor: disabled ? 'default' : 'pointer',
  display: 'inline-block',
  height: '48px',
  lineHeight: '48px',
  marginBottom: '16px',
  maxWidth: '100%',
  minWidth: '150px',
  opacity: disabled ? 0.56 : 1,
  outline: 'none',
  padding: '0 32px',
  textDecoration: 'none',
  touchAction: 'manipulation',
  transition: defaultTransition,
  width: block ? '100%' : 'auto',
});

export const buttonLinkStyle: (
  theme: Theme,
  props: ButtonProps<HTMLAnchorElement>,
) => ObjectInterpolation<undefined> = (theme, props) => ({
  ...buttonStyle(theme, props),
  display: 'inline-flex !important',
});

export const filterButtonProps = (props: ButtonProps) => {
  return filterProps(filterTextProps(props) as ButtonProps, ['backgroundColor', 'noCapital']);
};

export const Button = ({showLoading, children, loadingColor = COLOR.WHITE, ...props}: ButtonProps) => (
  <button css={theme => buttonStyle(theme, props)} {...filterButtonProps(props)}>
    {showLoading ? <Loading size={30} color={loadingColor} style={{display: 'flex', margin: 'auto'}} /> : children}
  </button>
);

const filterButtonLinkProps = (props: ButtonProps<HTMLAnchorElement>) => {
  return filterProps(filterTextProps(props) as ButtonProps<HTMLAnchorElement>, [
    'backgroundColor',
    'disabled',
    'noCapital',
  ]);
};

export const ButtonLink = ({
  children,
  showLoading,
  loadingColor = COLOR.WHITE,
  ...props
}: ButtonProps<HTMLAnchorElement>) => (
  <a css={theme => buttonLinkStyle(theme, props)} {...filterButtonLinkProps(props)}>
    {showLoading ? <Loading size={30} color={loadingColor} style={{display: 'flex', margin: 'auto'}} /> : children}
  </a>
);
