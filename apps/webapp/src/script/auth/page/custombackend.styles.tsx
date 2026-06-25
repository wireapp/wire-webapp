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

import {media} from '@wireapp/react-ui-kit';

export const logoCss: CSSObject = {
  marginBottom: '80px',
  display: 'none',
  [media.tabletDown]: {
    display: 'unset',
  },
};

export const headerCss: CSSObject = {
  fontSize: '1.5rem',
  marginBottom: '0.5rem',
};

export const buttonContainerCss: CSSObject = {
  marginTop: '1rem',
  gap: '1rem',
  display: 'flex',
};

export const containerCss: CSSObject = {
  width: '100%',
  maxWidth: '310px',
};

export const paragraphCss: CSSObject = {
  marginTop: '1.5rem',
};
