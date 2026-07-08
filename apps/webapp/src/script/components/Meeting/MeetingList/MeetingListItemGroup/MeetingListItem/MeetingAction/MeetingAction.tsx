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

import type {Meeting} from 'Components/Meeting/MeetingList/MeetingList';
import {getMeetingActionEntries} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/MeetingAction/getMeetingActionEntries';
import {
  iconContainerStyle,
  iconStyles,
} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/MeetingAction/MeetingAction.styles';
import {useEditMeeting} from 'Components/Meeting/useEditMeeting';
import {canEditMeeting} from 'Components/Meeting/utils/canEditMeeting';
import {UserState} from 'Repositories/user/userState';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {showContextMenu} from '../../../../../../ui/contextMenu';

interface MeetingActionProps {
  meeting: Meeting;
}

export const MeetingAction = ({meeting}: MeetingActionProps) => {
  const {translate, wallClock, fireAndForgetInvoker} = useApplicationContext();
  const {editMeeting} = useEditMeeting();
  const selfUser = container.resolve(UserState).self();

  const handleActionButton = (event: MouseEvent<HTMLElement>) => {
    const nowMs = wallClock.currentTimestampInMilliseconds;

    showContextMenu({
      event,
      entries: getMeetingActionEntries({
        meeting,
        selfUser,
        nowMs,
        translate,
        onEdit: () => {
          if (canEditMeeting(meeting, selfUser, wallClock.currentTimestampInMilliseconds)) {
            fireAndForgetInvoker.fireAndForget(() => editMeeting(meeting));
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
