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

import {COLOR_V2, media} from '@wireapp/react-ui-kit';

export const leftSectionCss: CSSObject = {
  background: 'black',
  margin: 0,
  height: '100vh',
  maxWidth: '26rem',
  padding: '6rem 3.75rem',
  position: 'relative',
  minHeight: '42rem',
  [media.tablet]: {
    display: 'none',
  },
};

export const contentContainerCss: CSSObject = {
  maxHeight: '100vh',
  overflowY: 'auto',
  width: '100%',
  alignSelf: 'center',
};

export const whiteFontCss: CSSObject = {
  color: 'white',
};

export const bodyCss: CSSObject = {
  flex: 'auto',
  flexDirection: 'row',
  background: COLOR_V2.WHITE,
  height: '100%',
  minHeight: '100vh',
};
