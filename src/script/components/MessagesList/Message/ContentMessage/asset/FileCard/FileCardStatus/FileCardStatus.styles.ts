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

import {COLOR_V2} from '@wireapp/react-ui-kit';

export const wrapperStyles: CSSObject = {
  width: '100%',
  height: '100%',
  borderRadius: '10px',
  position: 'absolute',
  left: 0,
  top: 0,
  pointerEvents: 'none',
  overflow: 'hidden',
};

const statusStyles: CSSObject = {
  height: '3px',
  width: '100%',
  position: 'absolute',
  bottom: 0,
  left: 0,
};

export const errorStyles: CSSObject = {
  ...statusStyles,
  backgroundColor: COLOR_V2.RED_LIGHT_500,

  'body.theme-dark &': {
    backgroundColor: COLOR_V2.RED_DARK_500,
  },
};

export const loadingStyles: CSSObject = {
  ...statusStyles,
  backgroundColor: 'var(--accent-color)',
};
