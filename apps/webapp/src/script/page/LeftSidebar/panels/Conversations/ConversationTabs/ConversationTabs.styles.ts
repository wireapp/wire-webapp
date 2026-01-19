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
  display: 'flex',
  gap: '10px',
  marginBottom: '4px',
  padding: '8px',
};

export const footerDisclaimerTooltip: CSSObject = {
  alignItems: 'center',
  display: 'flex',
};

export const footerDisclaimerEllipsis: CSSObject = {
  alignSelf: 'center',
  color: 'var(--text-input-placeholder)',
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

export const iconStyle: CSSObject = {
  path: {
    fill: 'var(--amber-500)',
  },
};

export const conversationsTitleWrapper: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingRight: '6px',
};
