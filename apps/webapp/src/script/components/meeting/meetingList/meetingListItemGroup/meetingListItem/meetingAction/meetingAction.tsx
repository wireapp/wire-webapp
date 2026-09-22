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

import {MouseEvent} from 'react';

import {container} from 'tsyringe';

import {IconButton, MoreIcon} from '@wireapp/react-ui-kit';

import {showMeetingLinkConfirmation} from 'Components/meeting/meetingLinkConfirmation/meetingLinkConfirmation';
import {getMeetingActionEntries} from 'Components/meeting/meetingList/meetingListItemGroup/meetingListItem/meetingAction/getMeetingActionEntries';
import {
  iconContainerStyle,
  iconStyles,
} from 'Components/meeting/meetingList/meetingListItemGroup/meetingListItem/meetingAction/meetingAction.styles';
import type {MeetingInstance} from 'Components/meeting/types/meetingInstance';
import {useDeleteMeeting} from 'Components/meeting/useDeleteMeeting';
import {useEditMeeting} from 'Components/meeting/useEditMeeting';
import {canDeleteMeetingForAll, canDeleteMeetingForMe} from 'Components/meeting/utils/canDeleteMeeting';
import {canEditMeeting, isMeetingHost} from 'Components/meeting/utils/canEditMeeting';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import type {User} from 'Repositories/entity/User';
import {useApplicationContext, useMainViewModel} from 'src/script/page/rootProvider';

import {showContextMenu} from '../../../../../../ui/contextMenu';

interface MeetingActionProps {
  meetingInstance: MeetingInstance;
  selfUser: User | undefined;
  joinMeeting: () => void;
  isJoinDisabled: boolean;
}

export const MeetingAction = ({meetingInstance, selfUser, joinMeeting, isJoinDisabled}: MeetingActionProps) => {
  const {translate, wallClock, fireAndForgetInvoker} = useApplicationContext();
  const {content} = useMainViewModel();
  const {editMeeting} = useEditMeeting();
  const {openDeleteMeetingModal} = useDeleteMeeting();

  const handleActionButton = (event: MouseEvent<HTMLElement>) => {
    if (selfUser === undefined) {
      return;
    }

    const nowMilliseconds = wallClock.currentTimestampInMilliseconds;

    showContextMenu({
      event,
      entries: getMeetingActionEntries({
        meetingInstance,
        selfUser,
        nowMilliseconds,
        translate,
        onJoin: joinMeeting,
        isJoinDisabled,
        onEdit: () => {
          if (canEditMeeting(meetingInstance, selfUser, wallClock.currentTimestampInMilliseconds)) {
            fireAndForgetInvoker.fireAndForget(() => editMeeting(meetingInstance));
          }
        },
        onDeleteForAll: () => {
          if (canDeleteMeetingForAll(meetingInstance, selfUser)) {
            openDeleteMeetingModal(meetingInstance, 'forAll', selfUser);
          }
        },
        onDeleteForMe: () => {
          if (canDeleteMeetingForMe(meetingInstance, selfUser)) {
            openDeleteMeetingModal(meetingInstance, 'forMe', selfUser);
          }
        },
        onMeetingLink: () => {
          const isHost = isMeetingHost(meetingInstance.meetingSeries, selfUser);
          const conversation = container
            .resolve(ConversationState)
            .findConversation(meetingInstance.meetingSeries.qualified_conversation);
          const cachedAccessCode = conversation?.accessCode();
          const requestMeetingLinkTask = isHost
            ? () =>
                content.repositories.conversation.requestMeetingConversationCode(
                  meetingInstance.meetingSeries.qualified_conversation,
                )
            : undefined;
          const getMeetingLinkTask = () =>
            content.repositories.conversation.getMeetingConversationCode(
              meetingInstance.meetingSeries.qualified_conversation,
            );

          if (cachedAccessCode) {
            showMeetingLinkConfirmation({
              meetingLink: {
                meetingLink: cachedAccessCode,
                hasPassword: conversation?.accessCodeHasPassword() === true,
              },
              retryMeetingLink: requestMeetingLinkTask,
              translate,
            });
            return;
          }

          const openMeetingLink = async (): Promise<void> => {
            const result = await getMeetingLinkTask().toPromise();
            result.match({
              Ok: meetingLink =>
                showMeetingLinkConfirmation({meetingLink, retryMeetingLink: requestMeetingLinkTask, translate}),
              Err: () =>
                showMeetingLinkConfirmation({
                  meetingLinkUnavailable: true,
                  meetingLinkUnavailableForHost: isHost,
                  retryMeetingLink: requestMeetingLinkTask,
                  translate,
                }),
            });
          };
          fireAndForgetInvoker.fireAndForget(openMeetingLink);
        },
      }),
      identifier: 'message-options-menu',
    });
  };

  return (
    <IconButton css={iconContainerStyle} onClick={handleActionButton}>
      <MoreIcon width={16} height={16} css={iconStyles} />
    </IconButton>
  );
};
