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

export const meetingPrepInviteesRootStyles: CSSObject = {
  position: 'relative',
  outline: 'none',
  marginTop: 4,
};

export const meetingPrepInviteesTriggerStyles: CSSObject = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  margin: '0 0 0 -2px',
  padding: '2px 6px 2px 2px',
  border: 'none',
  borderRadius: 8,
  background: 'transparent',
  color: 'var(--text-input-placeholder)',
  cursor: 'pointer',
  font: 'inherit',
  fontSize: 14,

  '&:hover, &[aria-expanded="true"]': {
    backgroundColor: 'var(--foreground-fade-8)',
    color: 'var(--main-color)',
  },

  '&:focus-visible': {
    outline: '2px solid var(--accent-color)',
  },
};

export const meetingPrepInviteesListStyles: CSSObject = {
  position: 'absolute',
  zIndex: 25,
  top: 'calc(100% + 6px)',
  left: 0,
  width: 'min(300px, calc(100vw - 16px))',
  maxHeight: 340,
  overflowY: 'auto',
  padding: 8,
  border: '1px solid var(--foreground-fade-16)',
  borderRadius: 12,
  backgroundColor: 'var(--dropdown-menu-bg)',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.14)',
  color: 'var(--main-color)',
};

export const meetingPrepInviteesHeadStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '4px 6px 8px',
};

export const meetingPrepInviteesTitleStyles: CSSObject = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
};

export const meetingPrepInviteesCloseStyles: CSSObject = {
  display: 'inline-flex',
  width: 24,
  height: 24,
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: 'none',
  borderRadius: 6,
  background: 'transparent',
  cursor: 'pointer',

  '&:focus-visible': {
    outline: '2px solid var(--accent-color)',
  },
};

export const meetingPrepInviteeItemsStyles: CSSObject = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

export const meetingPrepInviteeItemStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: 6,
  borderRadius: 6,
  fontSize: 14,
};

export const meetingPrepInviteeTagStyles: CSSObject = {
  marginLeft: 'auto',
  color: 'var(--text-input-placeholder)',
  fontSize: 12,
};
