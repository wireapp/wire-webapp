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

export const footerDisclaimer: CSSObject = {
  display: 'grid',
  gap: '10px',
  gridTemplateColumns: '1fr auto',
  padding: '8px',
};

export const footerDisclaimerEllipsis: CSSObject = {
  color: 'var(--gray-70)',
  fontSize: '0.75rem',
  fontWeight: '400',
  lineHeight: '14px',
  placeContent: 'center',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap',

  '.conversations-sidebar .conversations-sidebar-items[data-is-collapsed=true] &': {
    display: 'none',
  },
};
