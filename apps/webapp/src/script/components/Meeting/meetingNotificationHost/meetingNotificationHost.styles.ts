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

import type {CSSObject} from '@emotion/react';

export const meetingNotificationHostStyles: CSSObject = {
  position: 'absolute',
  bottom: 0,
  zIndex: 100000001,
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  maxWidth: 320,
  pointerEvents: 'none',
};

export const meetingNotificationHostFallbackStyles: CSSObject = {
  position: 'fixed',
  right: 'auto',
  maxWidth: 320,
};

export const meetingNotificationHostContainerStyles: CSSObject = {
  width: '100%',
  padding: '12px 12px 0 12px',
  boxSizing: 'border-box',
  border: '1px solid var(--border-color)',
  borderRadius: '12px 12px 0 0',
  backgroundColor: 'var(--app-bg)',
  pointerEvents: 'auto',
};

export const meetingNotificationHostHeaderStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  fontSize: 'var(--font-size-medium)',
  justifyContent: 'space-between',
  gap: 8,
  fontWeight: 'var(--font-weight-medium)',
};

export const meetingNotificationHostFooterStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
};

export const meetingNotificationHostButtonStyles: CSSObject = {
  padding: 8,
  paddingBottom: 12,
  border: 0,
  background: 'transparent',
  color: 'var(--main-color)',
  cursor: 'pointer',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-medium)',
};

export const meetingNotificationHostDismissAllButtonStyles: CSSObject = {
  ...meetingNotificationHostButtonStyles,
  fontSize: 'var(--font-size-medium)',
  color: 'var(--accent-color)',
};

export const meetingNotificationHostListStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  maxHeight: 320,
  marginTop: 12,
  overflowY: 'auto',
};

export const meetingNotificationHostExpandIconStyles = (isExpanded: Boolean): CSSObject => ({
  transform: isExpanded ? 'rotate(90deg)' : 'rotate(270deg)',
  transition: 'all 500ms var(--ease-out-expo)',
  marginRight: '2px',
  height: '10px',
  width: '10px',
});
