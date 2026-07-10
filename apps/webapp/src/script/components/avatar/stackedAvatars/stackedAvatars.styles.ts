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

export const AVATAR_OVERLAP_OFFSET = 8;

export const wrapperStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
};

export const avatarItemStyles = (index: number, avatarRingColor: string): CSSObject => ({
  display: 'flex',
  marginLeft: index > 0 ? -AVATAR_OVERLAP_OFFSET : 0,
  zIndex: index + 1,
  borderRadius: '50%',
  boxShadow: `0 0 0 1px ${avatarRingColor}`,
});

export const overflowCountStyles: CSSObject = {
  marginLeft: 8,
  color: 'var(--secondary-text-color)',
  fontSize: 12,
  fontWeight: 'var(--font-weight-semibold)',
  whiteSpace: 'nowrap',
};
