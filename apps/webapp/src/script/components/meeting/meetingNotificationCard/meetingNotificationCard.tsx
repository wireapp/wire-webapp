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

import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {match, P} from 'ts-pattern';
import {container} from 'tsyringe';

import {Button, ButtonVariant, CalendarIcon} from '@wireapp/react-ui-kit';

import {UserState} from 'Repositories/user/userState';
import {useApplicationContext} from 'src/script/page/rootProvider';
import type {Translate, TranslationKey} from 'Util/localizerUtil';
import {matchQualifiedIds} from 'Util/qualifiedId';
import {formatLocale} from 'Util/timeUtil';

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
import {type MeetingNotification, MeetingNotificationKind} from '../meetingNotificationStore/meetingNotificationStore';

type MeetingNotificationCardProps = MeetingNotification & {
  onDismiss: () => void;
};

const notificationLabels = {
  [MeetingNotificationKind.INVITE]: 'meetings.notifications.invitation',
  [MeetingNotificationKind.UPDATE]: 'meetings.notifications.update',
  [MeetingNotificationKind.CANCELLED]: 'meetings.notifications.canceled',
  [MeetingNotificationKind.ONGOING]: 'meetings.notifications.ongoing',
} as const satisfies Record<MeetingNotificationKind, TranslationKey>;

const getOrganizer = (qualifiedCreator: QualifiedId) =>
  container
    .resolve(UserState)
    .users()
    .find(user => matchQualifiedIds(user.qualifiedId, qualifiedCreator))
    ?.name() ?? qualifiedCreator.id;

const getMeetingTime = (meetingStartTime: string) => formatLocale(meetingStartTime, 'PP, p');

const MeetingNotificationOrganizerAndTimeMetadata = ({
  qualifiedCreator,
  meetingStartTime,
  translate,
}: {
  qualifiedCreator: QualifiedId;
  meetingStartTime: string;
  translate: Translate;
}) => {
  const organizer = getOrganizer(qualifiedCreator);
  const meetingTime = getMeetingTime(meetingStartTime);

  return (
    <>
      {translate('meetings.notifications.by', {organizer})}
      {organizer && meetingTime && <span aria-hidden="true"> • </span>}
      {meetingTime}
    </>
  );
};

const MeetingNotificationMetadata = ({
  notification,
  translate,
}: {
  notification: MeetingNotification;
  translate: Translate;
}) => {
  return match(notification)
    .with(
      {
        kind: P.union(
          MeetingNotificationKind.INVITE,
          MeetingNotificationKind.UPDATE,
          MeetingNotificationKind.CANCELLED,
        ),
      },
      ({qualifiedCreator, meetingStartTime}) => (
        <MeetingNotificationOrganizerAndTimeMetadata
          qualifiedCreator={qualifiedCreator}
          meetingStartTime={meetingStartTime}
          translate={translate}
        />
      ),
    )
    .with({kind: MeetingNotificationKind.ONGOING}, ({qualifiedCreator, meetingStartTime}) => {
      const organizer = getOrganizer(qualifiedCreator);
      const meetingTime = getMeetingTime(meetingStartTime);

      return (
        <>
          {translate('meetings.notifications.by', {organizer})}
          {organizer && <span aria-hidden="true"> • </span>}
          <span css={meetingNotificationCardOngoingTimeStyles}>
            {translate('meetings.meetingStatus.startedAt', {time: meetingTime})}
          </span>
        </>
      );
    })
    .exhaustive();
};

export const MeetingNotificationCard = (notification: MeetingNotificationCardProps) => {
  const {translate} = useApplicationContext();
  const {kind, meetingTitle, id, onDismiss} = notification;
  return (
    <div css={meetingNotificationCardContainerStyles} role="listitem" data-uie-name={`meeting-notification-card-${id}`}>
      <div css={meetingNotificationCardTitleStyles}>
        {translate(
          'meetings.notifications.title',
          {label: translate(notificationLabels[kind]), meetingTitle},
          undefined,
          true,
        )}
      </div>
      <div css={meetingNotificationCardMetadataStyles}>
        <MeetingNotificationMetadata notification={notification} translate={translate} />
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
            onClick={() => {
              onDismiss();
              navigate('/meetings');
            }}
          >
            <CalendarIcon css={meetingNotificationViewBtnStyles} /> {translate('meetings.notifications.view')}
          </Button>
        )}
      </div>
    </div>
  );
};
