/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {COLOR_V2} from '../../Identity/colors-v2/colors-v2';

type LinkStateStyles = {
  base: CSSObject;
  enabled: CSSObject;
  disabled: CSSObject;
};

export const styles: {
  buttonReset: CSSObject;
  link: LinkStateStyles;
} = {
  buttonReset: {
    background: 'none',
    border: 'none',
    padding: 0,
    margin: 0,
  },
  link: {
    base: {
      textDecoration: 'underline',
    },
    enabled: {
      color: COLOR_V2.BLACK,
      cursor: 'pointer',
      '&:hover': {
        color: COLOR_V2.BLUE,
        textDecorationThickness: '2px',
      },
      '&:focus-visible': {
        color: COLOR_V2.BLUE,
        background: 'rgba(255, 255, 255, 0.01)',
        borderRadius: 4,
        outline: '2px solid transparent',
        boxShadow: `0 0 0 2px ${COLOR_V2.BLUE_LIGHT_300}`,
      },
    },
    disabled: {
      color: COLOR_V2.GRAY_80,
      cursor: 'default',
    },
  },
};
