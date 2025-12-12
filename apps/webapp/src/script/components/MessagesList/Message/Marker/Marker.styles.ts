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

import {css} from '@emotion/react';

export const baseMarkerStyle = css`
  padding-top: 8px; // TODO margin top is not working because of collapsing margins
  line-height: 2.5rem;
  user-select: none;

  .message-header-icon {
    max-height: 40px;
  }

  .message-header-label {
    border-bottom: 1px dotted var(--foreground-fade-24);
  }

  .message-unread-dot {
    background-color: var(--accent-color);
  }
`;

export const dayMarkerStyle = css`
  border-bottom: 1px solid var(--foreground-fade-24);

  .message-header-label {
    border: 0;
  }
`;

export const notVirtualizedMarkerStyle = css`
  height: 48px;
  margin-bottom: 8px;
`;
