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

export const meetingNotificationCardContainerStyles: CSSObject = {
  position: 'relative',
  width: '100%',
  boxSizing: 'border-box',
  padding: 12,
  border: '1px solid var(--border-color)',
  borderRadius: 12,
  backgroundColor: 'var(--app-bg)',
  pointerEvents: 'auto',
};

export const meetingNotificationCardTitleStyles: CSSObject = {
  fontWeight: 'var(--font-weight-medium)',
  fontSize: 'var(--font-size-medium)',
};

export const meetingNotificationCardMetadataStyles: CSSObject = {
  color: 'var(--text-color-secondary)',
  fontSize: 'var(--font-size-small)',
  marginTop: 2,
};

export const meetingNotificationCardOngoingTimeStyles: CSSObject = {
  color: 'var(--accent-color)',
  fontWeight: 'var(--font-weight-medium)',
};

export const meetingNotificationCardActionsStyles: CSSObject = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 8,
};

export const meetingNotificationCardActionStyles: CSSObject = {
  height: 32,
  flexGrow: 1,
  cursor: 'pointer',
  fontSize: 'var(--font-size-medium)',
  fontWeight: 'var(--font-weight-medium)',
  pointerEvents: 'auto',
  borderRadius: 12,
  margin: '16px 0 0 0',
};

export const meetingNotificationViewBtnStyles: CSSObject = {
  height: 16,
  width: 16,
  marginRight: 8,
};
