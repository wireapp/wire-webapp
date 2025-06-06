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

export const buttonStyles: CSSObject = {
  marginBottom: 0,
  position: 'relative',
};

export const counterStyles: CSSObject = {
  position: 'absolute',
  right: '-8px',
  top: '-8px',
  height: '18px',
  minWidth: '18px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '0 4px',
  backgroundColor: 'var(--accent-color)',
  borderRadius: '50%',
  color: 'var(--white)',
  fontSize: 'var(--font-size-xsmall)',
  fontWeight: 'var(--font-weight-semibold)',
};
