/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

export const viewerAccessLabelStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '4px',
  width: '159px',
  height: '32px',
  minHeight: '32px',
  borderRadius: '12px',
  backgroundColor: 'var(--Backgrounds-Background, #EDEFF0)',
  color: 'var(--gray-100, #17181A)',
  fontSize: 'var(--font-size-small)',
  lineHeight: 'var(--line-height-sm)',
  whiteSpace: 'nowrap',

  'body.theme-dark &': {
    backgroundColor: 'var(--gray-100, #17181A)',
    color: 'var(--white, #FFFFFF)',
  },

  svg: {
    color: 'currentColor',
    fill: 'currentColor',
    flexShrink: 0,
  },
};
