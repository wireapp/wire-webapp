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

export const ContainerStyle: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
  padding: '0.75rem',
  background: 'var(--accent-color-50)',
  '.theme-dark &': {
    background: 'var(--accent-color-800)',
    boxShadow: 'none',
  },
  border: '1px solid var(--accent-color-500)',
  borderRadius: '0.5rem',
  lineHeight: '1.5',
  marginTop: '0.3rem',
};

export const HeaderStyle: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  fontWeight: 'var(--font-weight-semibold)',
  gap: '0.5rem',
};

export const ContentStyle: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};
