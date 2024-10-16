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

import {CSSObject} from '@emotion/react';

import {COLOR, COLOR_V2} from '../Identity';

export const wrapperStyles: CSSObject = {
  display: 'grid',
  position: 'relative',
  textAlign: 'left',
  userSelect: 'none',
  verticalAlign: 'middle',
  width: '42px',
};

export const inputStyles: CSSObject = {
  height: '0',
  width: '0',
  opacity: '0',
  '&:focus + label': {
    outline: `1px solid ${COLOR_V2.BLUE_LIGHT_700}`,
  },
};

export const labelStyles = (disabled: boolean, showLoading: boolean): CSSObject => ({
  borderRadius: '20px',
  cursor: disabled || showLoading ? '' : 'pointer',
  display: 'block',
  margin: 0,
  overflow: 'hidden',
});

type SwitchStylesProps = {
  disabled: boolean;
  showLoading: boolean;
  checked: boolean;
  activatedColor: string;
  deactivatedColor: string;
};

export const switchStyles = ({
  disabled,
  showLoading,
  checked,
  activatedColor,
  deactivatedColor,
}: SwitchStylesProps): CSSObject => ({
  '&:after': {
    content: '" "',
    paddingRight: '10px',
    textAlign: 'right',
  },
  '&:before': {
    content: '" "',
    paddingLeft: '10px',
  },
  '&:before, &:after': {
    backgroundColor:
      disabled || showLoading
        ? COLOR.tint(checked ? activatedColor : deactivatedColor, 0.4)
        : checked
          ? activatedColor
          : deactivatedColor,
    boxSizing: 'border-box',
    display: 'block',
    float: 'left',
    height: '25px',
    lineHeight: '1.5625rem',
    padding: 0,
    width: '50%',
  },
  display: 'block',
  marginLeft: checked ? 0 : '-100%',
  transition: 'margin 0.1s ease-in 0s',
  width: '200%',
});

export const loadingStyles: CSSObject = {
  display: 'block',
  margin: '2px',
  position: 'absolute',
};

export const switchDotStyles = (disabled: boolean, checked: boolean): CSSObject => ({
  background: COLOR.WHITE,
  borderRadius: '100%',
  bottom: 0,
  boxShadow: '0px 0px 2px -1px gray',
  display: 'block',
  height: '23px',
  margin: '1px',
  opacity: disabled ? 0.7 : undefined,
  position: 'absolute',
  right: checked ? '0px' : '17px',
  top: 0,
  transition: 'all 0.15s ease-in 0s',
  width: '23px',
});
