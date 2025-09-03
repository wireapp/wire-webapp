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

export const headerIconBadge: CSSObject = {
  display: 'inline-flex',
  marginTop: '-2px',
  marginLeft: '8px',
  svg: {
    fill: 'var(--background-fade-40)',
  },
};

export const headerLabelBadge: CSSObject = {
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-regular)',
  color: 'var(--text-input-placeholder)',
  marginLeft: '4px',
};

export const headerIconSizeS: CSSObject = {
  width: '14px',
  height: '14px',
};

export const headerIconSizeM: CSSObject = {
  width: '16px',
  height: '16px',
};
