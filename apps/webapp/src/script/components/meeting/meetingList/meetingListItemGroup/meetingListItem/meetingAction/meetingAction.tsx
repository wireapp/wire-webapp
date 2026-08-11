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

import {MouseEvent, useEffect} from 'react';

import {IconButton, MoreIcon} from '@wireapp/react-ui-kit';

import {getMeetingActionEntries} from 'Components/meeting/meetingList/meetingListItemGroup/meetingListItem/meetingAction/getMeetingActionEntries';
import {
  iconContainerStyle,
  iconStyles,
} from 'Components/meeting/meetingList/meetingListItemGroup/meetingListItem/meetingAction/meetingAction.styles';
import type {MeetingInstance} from 'Components/meeting/types/meetingInstance';
import {useDeleteMeeting} from 'Components/meeting/useDeleteMeeting';
import {useEditMeeting} from 'Components/meeting/useEditMeeting';
import {canDeleteMeetingForAll, canDeleteMeetingForMe} from 'Components/meeting/utils/canDeleteMeeting';
import {canEditMeeting} from 'Components/meeting/utils/canEditMeeting';
import {getMeetingTemporalStatusAt, MeetingTemporalStatuses} from 'Components/meeting/utils/meetingStatusUtil';
import type {User} from 'Repositories/entity/User';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {closeContextMenu, showContextMenu} from '../../../../../../ui/contextMenu';

interface MeetingActionProps {
  meetingInstance: MeetingInstance;
  selfUser: User | undefined;
  joinMeeting: () => void;
  isJoinDisabled: boolean;
}

export const MeetingAction = ({meetingInstance, selfUser, joinMeeting, isJoinDisabled}: MeetingActionProps) => {
  const {translate, wallClock, fireAndForgetInvoker} = useApplicationContext();
  const {editMeeting} = useEditMeeting();
  const {openDeleteMeetingModal} = useDeleteMeeting();

  const temporalStatus = getMeetingTemporalStatusAt(
    new Date(wallClock.currentTimestampInMilliseconds),
    meetingInstance.start,
    meetingInstance.end,
  );

  useEffect(() => {
    if (temporalStatus === MeetingTemporalStatuses.PAST) {
      closeContextMenu();
    }
  }, [temporalStatus]);

  if (temporalStatus === MeetingTemporalStatuses.PAST) {
    return null;
  }

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
          if (canDeleteMeetingForAll(meetingInstance, selfUser, wallClock.currentTimestampInMilliseconds)) {
            openDeleteMeetingModal(meetingInstance, 'forAll', selfUser);
          }
        },
        onDeleteForMe: () => {
          if (canDeleteMeetingForMe(meetingInstance, selfUser, wallClock.currentTimestampInMilliseconds)) {
            openDeleteMeetingModal(meetingInstance, 'forMe', selfUser);
          }
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
