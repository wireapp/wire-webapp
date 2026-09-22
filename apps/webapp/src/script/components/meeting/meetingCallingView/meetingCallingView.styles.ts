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

import {meetingNotificationHostCollapsedOffset} from 'Components/meeting/meetingNotificationHost/meetingNotificationHost.styles';

const meetingCallingViewOffset = 24;

export const meetingCallingViewStyles = (hasNotifications: boolean): CSSObject => ({
  position: 'absolute',
  bottom: `${hasNotifications ? meetingNotificationHostCollapsedOffset : meetingCallingViewOffset}px`,
  left: `${meetingCallingViewOffset}px`,
  width: 'min(420px, calc(100% - 48px))',
  zIndex: 2,
  pointerEvents: 'auto',
  transition: 'bottom var(--animation-timing-fast) ease-in-out',
});

export const meetingsContentWrapperStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  height: '100%',
  position: 'relative',
};
