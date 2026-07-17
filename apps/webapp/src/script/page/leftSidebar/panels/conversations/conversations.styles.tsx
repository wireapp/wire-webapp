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

export const conversationsSpacerStyles = (mdBreakpoint: Boolean): CSSObject => ({
  minWidth: mdBreakpoint ? '64px' : '0',
});

export const conversationsListHandleStyles: CSSObject = {
  position: 'absolute',
  zIndex: 10,
  top: 0,
  right: -6,
  bottom: 0,
  width: 12,
  padding: 0,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
};
