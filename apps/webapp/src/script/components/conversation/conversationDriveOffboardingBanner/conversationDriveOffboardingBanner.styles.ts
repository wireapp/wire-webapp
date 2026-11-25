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

import type {CSSObject} from '@emotion/react';

const infoStyles: CSSObject = {
  display: 'flex',
  flexShrink: 0,
  alignItems: 'center',
  gap: '12px',
  '& svg': {
    flexShrink: 0,
  },
};

export const bannerStyles: CSSObject = {
  ...infoStyles,
  padding: '12px 16px',
  backgroundColor: 'var(--warning-background)',
  color: 'var(--warning-color)',
  fontSize: 'var(--font-size-medium)',
  fontWeight: 'var(--font-weight-semibold)',
  '& strong': {
    fontWeight: 'var(--font-weight-bold)',
  },
};
