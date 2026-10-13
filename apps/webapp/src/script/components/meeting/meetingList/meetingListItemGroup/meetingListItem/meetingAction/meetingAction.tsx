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

import {MouseEvent, type FunctionComponent} from 'react';
import {isNullOrUndefined} from '@sindresorhus/is';

import {getMeetingActionEntries} from './getMeetingActionEntries';
import {iconContainerStyle, iconStyles} from './meetingAction.styles';

import {useApplicationContext} from '../../../../../../page/rootProvider';
import type {User} from '../../../../../../repositories/entity/User';
import {showContextMenu} from '../../../../../../ui/contextMenu';
import {MoreIcon} from '../../../../../../uiKit/dataDisplay/icon/moreIcon';
import {IconButton} from '../../../../../../uiKit/inputs/iconButton/iconButton';
import type {MeetingInstance} from '../../../../types/meetingInstance';
import {useDeleteMeeting} from '../../../../useDeleteMeeting';
import {useEditMeeting} from '../../../../useEditMeeting';
import {canDeleteMeetingForAll, canDeleteMeetingForMe} from '../../../../utils/canDeleteMeeting';
import {canEditMeeting} from '../../../../utils/canEditMeeting';
import {showMeetingLinkConfirmation} from '../../../../meetingLinkConfirmation/meetingLinkConfirmation';

interface MeetingActionProps {
  meetingInstance: MeetingInstance;
  selfUser: User | undefined;
  joinMeeting: () => void;
  isJoinDisabled: boolean;
}

export const MeetingAction: FunctionComponent<MeetingActionProps> = ({
  meetingInstance,
  selfUser,
  joinMeeting,
  isJoinDisabled,
}: MeetingActionProps) => {
  const {translate, clock, fireAndForgetInvoker} = useApplicationContext();
  const {editMeeting} = useEditMeeting();
  const {openDeleteMeetingModal} = useDeleteMeeting();

  const handleActionButton = (event: MouseEvent<HTMLElement>): void => {
    if (selfUser === undefined) {
      return;
    }

    const nowMilliseconds = clock.currentUnixEpochMilliseconds;

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
          if (canEditMeeting(meetingInstance, selfUser, clock.currentUnixEpochMilliseconds)) {
            fireAndForgetInvoker.fireAndForget(() => {
              return editMeeting(meetingInstance);
            });
          }
        },
        meetingLink: meetingInstance.meetingSeries.link,
        onShowMeetingLink: () => {
          const meetingLink = meetingInstance.meetingSeries.link;
          if (!isNullOrUndefined(meetingLink)) {
            showMeetingLinkConfirmation({link: meetingLink, translate});
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
