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

import {CSSObject} from '@emotion/react';

import {ButtonProps, buttonStyle} from './Button';

import {COLOR} from '../Identity';
import {Theme} from '../Layout';
import {Loading} from '../Misc';
import {filterTextProps} from '../Text';
import {filterProps} from '../util';

export const buttonLinkStyle: (theme: Theme, props: ButtonProps<HTMLAnchorElement>) => CSSObject = (theme, props) => ({
  ...buttonStyle(theme, props),
  display: 'inline-flex !important',
});

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
  <a css={(theme: Theme) => buttonLinkStyle(theme, props)} {...filterButtonLinkProps(props)}>
    {showLoading ? <Loading size={30} color={loadingColor} style={{display: 'flex', margin: 'auto'}} /> : children}
  </a>
);
