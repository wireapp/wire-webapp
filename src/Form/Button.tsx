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
import {TextProps, filterTextProps, textStyles} from '../Text';
import {filterProps} from '../util';

export interface ButtonProps<T = HTMLButtonElement> extends TextProps<T> {
  backgroundColor?: string;
  noCapital?: boolean;
}

const filterButtonProps = (props: Object) => {
  return filterProps(filterTextProps(props), ['backgroundColor', 'noCapital']);
};

const filterButtonLinkProps = (props: Object) => {
  return filterProps(filterTextProps(props), ['backgroundColor', 'disabled', 'noCapital']);
};

const buttonStyles: (props: ButtonProps) => ObjectInterpolation<undefined> = ({
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
}) => ({
  ...textStyles({
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
    backgroundColor: disabled ? COLOR.DISABLED : COLOR.shade(backgroundColor, 0.06),
    textDecoration: 'none',
  },
  backgroundColor: disabled ? COLOR.DISABLED : backgroundColor,
  border: 0,
  borderRadius: '8px',
  cursor: disabled ? 'default' : 'pointer',
  display: 'inline-block',
  height: '48px',
  lineHeight: '48px',
  marginBottom: '16px',
  maxWidth: '100%',
  minWidth: '150px',
  outline: 'none',
  padding: '0 32px',
  textDecoration: 'none',
  touchAction: 'manipulation',
  transition: defaultTransition,
  width: block ? '100%' : 'auto',
});

const buttonLinkStyles: (props: ButtonProps<HTMLAnchorElement>) => ObjectInterpolation<undefined> = props => ({
  ...buttonStyles(props as any),
  display: 'inline-block !important',
});

const Button = (props: ButtonProps) => <button css={buttonStyles(props)} {...filterButtonProps(props)} />;
const ButtonLink = (props: ButtonProps<HTMLAnchorElement>) => (
  <a css={buttonLinkStyles(props)} {...filterButtonLinkProps(props)} />
);

export {Button, ButtonLink, buttonStyles, filterButtonProps};
