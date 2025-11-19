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

import {CSSObject} from '@emotion/react/dist/emotion-react.cjs';

export const participatingStatusStyles = {
  color: 'var(--accent-color)',
  fontSize: 'var(--font-size-medium)',
  fontWeight: 'var(--font-weight-semibold)',
  display: 'flex',
  alignItems: 'center',
};

export const startingSoonStatusStyles: CSSObject = {
  color: 'var(--accent-color)',
  textTransform: 'uppercase',
  fontWeight: 'var(--font-weight-semibold)',
};

export const participatingStatusIconStyles = {
  marginRight: '8px',
  fill: 'var(--accent-color)',
};

export const joinButtonContainerStyles = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export const joinButtonStyles = {
  height: '32px',
  borderRadius: '8px',
  fontSize: 'var(--font-size-medium)',
  fontWeight: 'var(--font-weight-semibold)',
  minWidth: '83px',
  color: 'var(--white)',
};

export const joinButtonIconStyles: CSSObject = {
  marginRight: '8px',
  fill: 'var(--white)',
};
