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

export const label: CSSObject = {
  fontSize: 'var(--font-size-medium)',
  fontWeight: 'var(--font-weight-regular)',
  lineHeight: 'var(--line-height-sm)',
  color: 'var(--text-input-label)',
  marginBottom: 2,
};

export const input: CSSObject = {
  boxShadow: '0 0 0 1px var(--text-input-border)',
  borderRadius: 12,
  margin: 0,
};

export const link: CSSObject = {
  marginTop: 24,
};

export const linkText: CSSObject = {
  textDecoration: 'underline',
  marginBottom: 24,
};
