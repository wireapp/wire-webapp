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

export const callingCellWrapper: CSSObject = {
  backgroundColor: 'var(--app-bg-secondary)',
  border: '1px solid 1px solid var(--border-color)',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  padding: '12px 12px 16px',
};

export const callingContainer: CSSObject = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: '0',
  padding: '10px 12px 20px',
  animation: 'show-call-ui @animation-timing-fast ease-in-out 0s 1',
};

export const infoBar: CSSObject = {
  backgroundColor: 'var(--accent-color)',
  borderRadius: '8px',
  color: 'var(--app-bg-secondary)',
  fontSize: 'var(--line-height-xs)',
  fontWeight: 'var(--font-weight-medium)',
  margin: '8px 8px 0',
  padding: '4px',
  textAlign: 'center',
};
