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

import {useLayoutEffect, useState} from 'react';

import {createPortal} from 'react-dom';

import {ChevronIcon} from '@wireapp/react-ui-kit';

import {MeetingNotificationCard} from 'Components/Meeting/meetingNotificationCard/meetingNotificationCard';
import {useMeetingNotificationStore} from 'Components/Meeting/meetingNotificationStore/meetingNotificationStore';
import {translate} from 'Util/localizerUtil';

import {
  meetingNotificationHostButtonStyles,
  meetingNotificationHostContainerStyles,
  meetingNotificationHostDismissAllButtonStyles,
  meetingNotificationHostExpandIconStyles,
  meetingNotificationHostFallbackStyles,
  meetingNotificationHostFooterStyles,
  meetingNotificationHostHeaderStyles,
  meetingNotificationHostListStyles,
  meetingNotificationHostStyles,
} from './meetingNotificationHost.styles';
import {MEETING_NOTIFICATION_HOST_ELEMENT_ID} from './useMeetingNotificationHostElement';

type MeetingNotificationHostProps = {
  targetElement?: HTMLElement | null;
};

export const MeetingNotificationHost = ({targetElement = null}: MeetingNotificationHostProps) => {
  const notifications = useMeetingNotificationStore(state => state.notifications);
  const [isExpanded, setIsExpanded] = useState(false);
  const [fallbackDimensions, setFallbackDimensions] = useState({left: 16, width: 320});

  useLayoutEffect(() => {
    if (targetElement?.id === MEETING_NOTIFICATION_HOST_ELEMENT_ID.CONVERSATIONS) {
      return;
    }

    const centerColumn = document.getElementById(MEETING_NOTIFICATION_HOST_ELEMENT_ID.CENTER_COLUMN);
    if (!centerColumn) {
      return;
    }

    const updateFallbackDimensions = () => {
      const {left, width} = centerColumn.getBoundingClientRect();
      if (width === 0) {
        return;
      }

      setFallbackDimensions({
        left: Math.max(0, left),
        width: 320,
      });
    };

    updateFallbackDimensions();
    window.addEventListener('resize', updateFallbackDimensions);
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateFallbackDimensions);
    resizeObserver?.observe(centerColumn);

    return () => {
      window.removeEventListener('resize', updateFallbackDimensions);
      resizeObserver?.disconnect();
    };
  }, [targetElement]);

  if (!targetElement || notifications.length === 0) {
    return null;
  }

  return createPortal(
    <div
      css={{
        ...meetingNotificationHostStyles,
        ...(targetElement.id === MEETING_NOTIFICATION_HOST_ELEMENT_ID.CONVERSATIONS
          ? {}
          : {...meetingNotificationHostFallbackStyles, ...fallbackDimensions}),
      }}
      data-testid="meeting-notification-host"
      data-uie-name="meeting-notification-host"
    >
      <div css={meetingNotificationHostContainerStyles}>
        <div css={meetingNotificationHostHeaderStyles}>
          <span aria-live="polite">{translate('meetings.notifications.total', {count: notifications.length})}</span>
          <div>
            <button
              type="button"
              css={meetingNotificationHostDismissAllButtonStyles}
              onClick={() => useMeetingNotificationStore.getState().clearNotifications()}
            >
              {translate('meetings.notifications.dismissAll')}
            </button>
          </div>
        </div>
        {isExpanded && (
          <div
            id="meeting-notification-list"
            css={meetingNotificationHostListStyles}
            data-testid="meeting-notification-list"
            data-uie-name="meeting-notification-list"
          >
            {notifications.map(notification => (
              <MeetingNotificationCard
                key={notification.id}
                {...notification}
                onDismiss={() => useMeetingNotificationStore.getState().dismissNotification(notification.id)}
              />
            ))}
          </div>
        )}
        <div css={meetingNotificationHostFooterStyles}>
          <button
            type="button"
            css={meetingNotificationHostButtonStyles}
            aria-expanded={isExpanded}
            aria-controls="meeting-notification-list"
            onClick={() => setIsExpanded(expanded => !expanded)}
          >
            <ChevronIcon css={meetingNotificationHostExpandIconStyles(isExpanded)} />
            {translate(isExpanded ? 'meetings.notifications.collapse' : 'meetings.notifications.expand')}
          </button>
        </div>
      </div>
    </div>,
    targetElement,
  );
};
