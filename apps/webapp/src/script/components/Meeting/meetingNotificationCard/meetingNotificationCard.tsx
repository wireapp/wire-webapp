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

import {match} from 'ts-pattern';

import {Button, ButtonVariant, CalendarIcon} from '@wireapp/react-ui-kit';

import {translate} from 'Util/localizerUtil';
import type {TranslationKey} from 'Util/localizerUtil';

import {
  meetingNotificationCardActionsStyles,
  meetingNotificationCardActionStyles,
  meetingNotificationCardContainerStyles,
  meetingNotificationCardMetadataStyles,
  meetingNotificationCardOngoingTimeStyles,
  meetingNotificationCardTitleStyles,
  meetingNotificationViewBtnStyles,
} from './meetingNotificationCard.styles';

import {navigate} from '../../../router/Router';
import {MeetingNotificationKind, type MeetingNotification} from '../meetingNotificationStore/meetingNotificationStore';

type MeetingNotificationCardProps = MeetingNotification & {
  onDismiss: () => void;
};

const notificationLabels = {
  [MeetingNotificationKind.INVITE]: 'meetings.notifications.invitation',
  [MeetingNotificationKind.UPDATE]: 'meetings.notifications.update',
  [MeetingNotificationKind.CANCELLED]: 'meetings.notifications.canceled',
  [MeetingNotificationKind.ONGOING]: 'meetings.notifications.ongoing',
} as const satisfies Record<MeetingNotificationKind, TranslationKey>;

const MeetingNotificationMetadata = ({notification}: {notification: MeetingNotification}) => {
  return match(notification)
    .with({kind: MeetingNotificationKind.INVITE}, ({organizer, meetingTime}) => (
      <>
        {organizer}
        {organizer && meetingTime && <span aria-hidden="true"> • </span>}
        {meetingTime}
      </>
    ))
    .with({kind: MeetingNotificationKind.UPDATE}, ({meetingTime}) =>
      translate('meetings.notifications.newTime', {time: meetingTime}),
    )
    .with({kind: MeetingNotificationKind.CANCELLED}, ({organizer, meetingTime}) => (
      <>
        {organizer}
        {organizer && <span aria-hidden="true"> • </span>}
        {meetingTime}
      </>
    ))
    .with({kind: MeetingNotificationKind.ONGOING}, ({organizer, meetingTime}) => (
      <>
        {organizer}
        {organizer && <span aria-hidden="true"> • </span>}
        <span css={meetingNotificationCardOngoingTimeStyles}>
          {translate('meetings.meetingStatus.startedAt', {time: meetingTime})}
        </span>
      </>
    ))
    .exhaustive();
};

export const MeetingNotificationCard = (notification: MeetingNotificationCardProps) => {
  const {kind, meetingTitle, id, onDismiss} = notification;
  return (
    <div
      css={meetingNotificationCardContainerStyles}
      role="status"
      aria-live="polite"
      data-testid={`meeting-notification-card-${id}`}
      data-uie-name="meeting-notification-card"
    >
      <div css={meetingNotificationCardTitleStyles}>
        {translate('meetings.notifications.title', {label: translate(notificationLabels[kind]), meetingTitle})}
      </div>
      <div css={meetingNotificationCardMetadataStyles}>
        <MeetingNotificationMetadata notification={notification} />
      </div>
      <div css={meetingNotificationCardActionsStyles}>
        <Button
          variant={ButtonVariant.TERTIARY}
          css={meetingNotificationCardActionStyles}
          type="button"
          onClick={onDismiss}
          aria-label={translate('meetings.notifications.dismiss')}
        >
          {translate('meetings.notifications.dismiss')}
        </Button>
        {kind !== MeetingNotificationKind.CANCELLED && (
          <Button
            variant={ButtonVariant.PRIMARY}
            css={meetingNotificationCardActionStyles}
            type="button"
            onClick={() => navigate('/meetings')}
          >
            <CalendarIcon css={meetingNotificationViewBtnStyles} /> {translate('meetings.notifications.view')}
          </Button>
        )}
      </div>
    </div>
  );
};
