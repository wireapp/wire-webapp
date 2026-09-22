/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

export const wrapperStyle: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  containerType: 'inline-size',
};

export const titleStyle = (smallScreen: boolean): CSSObject => ({
  paddingRight: smallScreen ? '40px' : 0,
});

export const buttonsStyle: CSSObject = {
  marginBottom: 0,
};

export const contentStyle: CSSObject = {
  width: '100%',
  height: '100%',
  padding: '32px 32px 32px 72px',
  overflowX: 'hidden',

  // Rely on viewport media queries if container queries are not supported by the browser
  '@media (max-width: 768px)': {
    padding: '40px',
  },
  '@media (max-width: 480px)': {
    padding: '20px',
  },
  // Container queries are supported by recent browsers and allow a more flexible responsive design
  '@container (max-width: 768px)': {
    padding: '40px',
  },
  '@container (max-width: 480px)': {
    padding: '20px',
  },
};
