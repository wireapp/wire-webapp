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

import {CloseIcon, EditIcon, TrashIcon} from '@wireapp/react-ui-kit';

import {
  contextMenuDangerItemIconStyles,
  contextMenuDangerItemStyles,
} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/MeetingAction/MeetingAction.styles';
import {MEETING_ACTION_TRANSLATION_KEYS} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/MeetingAction/meetingActionTranslationKeys';
import type {MeetingInstance} from 'Components/Meeting/types/meetingInstance';
import {canEditMeeting, isMeetingHost} from 'Components/Meeting/utils/canEditMeeting';
import type {User} from 'Repositories/entity/User';
import type {ContextMenuEntry} from 'src/script/ui/contextMenu';
import type {Translate} from 'Util/localizerUtil';

type GetMeetingActionEntriesParams = {
  meetingInstance: MeetingInstance;
  selfUser: User;
  nowMs: number;
  translate: Translate;
  onEdit: () => void;
};

export const getMeetingActionEntries = ({
  meetingInstance,
  selfUser,
  nowMs,
  translate,
  onEdit,
}: GetMeetingActionEntriesParams): ContextMenuEntry[] => {
  const {meetingSeries} = meetingInstance;

  const editEntry: ContextMenuEntry = {
    icon: () => <EditIcon />,
    label: translate(MEETING_ACTION_TRANSLATION_KEYS.editMeeting),
    click: onEdit,
  };

  const deleteForMeEntry: ContextMenuEntry = {
    css: contextMenuDangerItemStyles,
    icon: () => <CloseIcon css={contextMenuDangerItemIconStyles} />,
    label: translate(MEETING_ACTION_TRANSLATION_KEYS.deleteMeetingForMe),
  };

  const deleteForAllEntry: ContextMenuEntry = {
    css: contextMenuDangerItemStyles,
    icon: () => <TrashIcon css={contextMenuDangerItemIconStyles} />,
    label: translate(MEETING_ACTION_TRANSLATION_KEYS.deleteMeetingForAll),
  };

  const isHost = isMeetingHost(meetingSeries, selfUser);

  return [
    ...(canEditMeeting(meetingSeries, selfUser, nowMs) ? [editEntry] : []),
    ...(isHost ? [deleteForAllEntry] : [deleteForMeEntry]),
  ];
};
