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

import {callSecurityButtonStyles, callSecurityLineStyles} from '../callSecurityLine/callSecurityLine.styles';

/** The size of a status chip. The green room status chip uses it too, so both chips line up. */
export const chipSizeStyles: CSSObject = {
  height: 20,
  fontSize: 12,
  lineHeight: '15px',
};

// The resting call security line, at the size of a status chip.
export const encryptedBadgeButtonStyles: CSSObject = {
  ...callSecurityLineStyles,
  ...callSecurityButtonStyles,
  ...chipSizeStyles,
};
