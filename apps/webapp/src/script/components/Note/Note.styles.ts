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
  gap: '12px',
  padding: '16px 20px',
  backgroundColor: '#e8f0fe',
  border: '1px solid #1967d2',
  borderRadius: '8px',
  color: '#000',
  lineHeight: '1.5',
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
