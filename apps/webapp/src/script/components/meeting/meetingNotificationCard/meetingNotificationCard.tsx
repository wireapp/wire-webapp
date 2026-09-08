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

import {useEffect} from 'react';

import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {match, P} from 'ts-pattern';
import {container} from 'tsyringe';

import {Button, ButtonVariant, CalendarIcon} from '@wireapp/react-ui-kit';

import {useJoinMeetingCall} from 'Components/meeting/useJoinMeetingCall';
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
  onCallJoined?: () => void;
};

type MeetingNotificationJoinButtonProps = {
  qualifiedConversationId: QualifiedId;
  onDismiss: () => void;
  onCallJoined?: () => void;
};

const MeetingNotificationJoinButton = ({
  qualifiedConversationId,
  onDismiss,
  onCallJoined,
}: MeetingNotificationJoinButtonProps) => {
  const {translate} = useApplicationContext();
  const {joinMeeting, isJoinDisabled, isCallActive, isCallConnecting, isJoining} =
    useJoinMeetingCall(qualifiedConversationId);

  useEffect(() => {
    if (isCallActive) {
      (onCallJoined ?? onDismiss)();
    }
  }, [isCallActive, onCallJoined, onDismiss]);

  return (
    <Button
      variant={ButtonVariant.PRIMARY}
      css={meetingNotificationCardActionStyles}
      type="button"
      onClick={() => {
        joinMeeting();
      }}
      disabled={isJoinDisabled}
      showLoading={isJoining || isCallConnecting}
      aria-label={translate('callJoin')}
      data-uie-name="join-meeting-call"
    >
      {translate('callJoin')}
    </Button>
  );
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
const getMeetingTimeOnly = (meetingStartTime: string) => formatLocale(meetingStartTime, 'p');

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
      {translate('meetings.notifications.by', {organizer}, undefined, true)}
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
      const meetingTime = getMeetingTimeOnly(meetingStartTime);

      return (
        <>
          {translate('meetings.notifications.by', {organizer}, undefined, true)}
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
  const primaryAction = () => {
    if (kind === MeetingNotificationKind.CANCELLED) {
      return null;
    }

    if (kind === MeetingNotificationKind.ONGOING) {
      return (
        <MeetingNotificationJoinButton
          qualifiedConversationId={notification.qualifiedConversationId}
          onDismiss={onDismiss}
          onCallJoined={notification.onCallJoined}
        />
      );
    }

    return (
      <Button
        variant={ButtonVariant.PRIMARY}
        css={meetingNotificationCardActionStyles}
        type="button"
        onClick={() => {
          onDismiss();
          navigate('/meetings');
        }}
        aria-label={translate('meetings.notifications.view')}
      >
        <CalendarIcon css={meetingNotificationViewBtnStyles} aria-hidden="true" />{' '}
        {translate('meetings.notifications.view')}
      </Button>
    );
  };

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
          onClick={event => {
            event.stopPropagation();
            onDismiss();
          }}
          aria-label={translate('meetings.notifications.dismiss')}
        >
          {translate('meetings.notifications.dismiss')}
        </Button>
        {primaryAction()}
      </div>
    </div>
  );
};
