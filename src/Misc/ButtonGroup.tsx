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
import {ReactElement} from 'react';

import {COLOR_V2} from '../Identity';
import {Theme} from '../Layout';
import {IconButtonProps} from './IconButton';

const buttonGroupStyle: <T>(theme: Theme) => CSSObject = () => ({
  display: 'flex',
  alignItems: 'center',
});

const buttonStyle: <T>(theme: Theme, props: IconButtonProps<T>) => CSSObject = (theme, {disabled = false}) => ({
  height: '32px',
  borderRadius: '12px',
  padding: '0 12px',
  background: COLOR_V2.WHITE,
  border: `1px solid ${COLOR_V2.GRAY_40}`,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  backgroundColor: disabled ? COLOR_V2.GRAY_20 : COLOR_V2.WHITE,
  svg: {
    fill: disabled ? COLOR_V2.GRAY_70 : COLOR_V2.BLACK,
  },
  '&:not(:last-child)': {
    borderTopRightRadius: '0',
    borderBottomRightRadius: '0',
  },
  '&:not(:first-child)': {
    borderTopLeftRadius: '0',
    borderBottomLeftRadius: '0',
  },
  '&:first-child:last-child': {
    borderRadius: '0',
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
});

interface GroupButtonProps<T = HTMLButtonElement> {
  children?: ReactElement | string;
  icon?: ReactElement;
}

const ButtonGroup = ({children}) => (
  <div css={(theme: Theme) => buttonGroupStyle(theme)} role="group" aria-label="Button Group">
    {children}
  </div>
);

const Button = ({children, icon, ...props}: GroupButtonProps) => {
  return (
    <button css={(theme: Theme) => buttonStyle(theme, props)} {...props}>
      {icon}
      {children && (
        <span
          css={{
            marginLeft: !!icon && '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            lineHeight: '14px',
            letterSpacing: '0.25px',
          }}
        >
          {children}
        </span>
      )}
    </button>
  );
};

ButtonGroup.Button = Button;

export {ButtonGroup};
