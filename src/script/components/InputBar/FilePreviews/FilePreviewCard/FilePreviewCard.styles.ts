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

import {CSSObject, css} from '@emotion/react';

export const wrapperStyles = css`
  grid-column: span 3;
  outline: none;
  position: relative;

  &:focus-visible {
    border-radius: 4px;
    box-shadow: 0 0 0 2px var(--accent-color);
  }
`;

export const cardStyles: CSSObject = {
  position: 'relative',
};
