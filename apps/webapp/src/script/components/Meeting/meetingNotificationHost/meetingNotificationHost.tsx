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

import {ChevronIcon} from '@wireapp/react-ui-kit';

import {MeetingNotificationCard} from 'Components/Meeting/meetingNotificationCard/meetingNotificationCard';
import {useMeetingNotificationStore} from 'Components/Meeting/meetingNotificationStore/meetingNotificationStore';
import {useApplicationContext} from 'src/script/page/rootProvider';

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

type MeetingNotificationHostProps = {
  isStandalone: boolean;
};

export const MeetingNotificationHost = ({isStandalone}: MeetingNotificationHostProps) => {
  const {translate} = useApplicationContext();
  const notifications = useMeetingNotificationStore(state => state.notifications);
  const isExpanded = useMeetingNotificationStore(state => state.isExpanded);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      css={{
        ...meetingNotificationHostStyles,
        ...(isStandalone ? meetingNotificationHostFallbackStyles : {}),
      }}
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
            data-uie-name="meeting-notification-expand"
            onClick={() => useMeetingNotificationStore.getState().setIsExpanded(!isExpanded)}
          >
            <ChevronIcon css={meetingNotificationHostExpandIconStyles(isExpanded)} />
            {translate(isExpanded ? 'meetings.notifications.collapse' : 'meetings.notifications.expand')}
          </button>
        </div>
      </div>
    </div>
  );
};
