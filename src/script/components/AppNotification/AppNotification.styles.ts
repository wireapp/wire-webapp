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

export const wrapper: CSSObject = {
  alignItems: 'center',
  backgroundColor: 'var(--main-color)',
  borderRadius: '8px',
  boxShadow: '0 2px 16px 0 var(--background-fade-16)',
  display: 'flex',
  gap: '16px',
  padding: '8px 16px',

  position: 'fixed',
  top: '0',
  left: '50%',
  translate: '-50% 0',
  transition: 'top 0.3s, opacity 0.3s',
  zIndex: '99',

  'body.theme-dark &': {
    backgroundColor: 'var(--gray-80)',
    boxShadow: '0 2px 16px 0 rgba(151, 151, 151, 0.12)',
  },
};

export const content: CSSObject = {
  color: 'var(--white)',
  fontSize: 'var(--font-size-base)',
  fontWeight: 'var(--font-weight-regular)',
  lineHeight: 'var(--line-height-lg)',
};

export const buttonStyles: CSSObject = {
  background: 'transparent',
  border: 'none',
  padding: 0,

  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export const closeIcon: CSSObject = {
  fill: 'var(--white)',
};
