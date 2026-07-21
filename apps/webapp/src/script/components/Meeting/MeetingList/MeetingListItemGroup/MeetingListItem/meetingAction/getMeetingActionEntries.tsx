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
} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/meetingAction/meetingAction.styles';
import {MEETING_ACTION_TRANSLATION_KEYS} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/meetingAction/meetingActionTranslationKeys';
import type {MeetingInstance} from 'Components/Meeting/types/meetingInstance';
import {canDeleteMeetingForAll, canDeleteMeetingForMe} from 'Components/Meeting/utils/canDeleteMeeting';
import {canEditMeeting} from 'Components/Meeting/utils/canEditMeeting';
import type {User} from 'Repositories/entity/User';
import type {ContextMenuEntry} from 'src/script/ui/contextMenu';
import type {Translate} from 'Util/localizerUtil';

type GetMeetingActionEntriesParams = {
  meetingInstance: MeetingInstance;
  selfUser: User;
  nowMilliseconds: number;
  translate: Translate;
  onEdit: () => void;
  onDeleteForAll: () => void;
  onDeleteForMe: () => void;
};

export const getMeetingActionEntries = ({
  meetingInstance,
  selfUser,
  nowMilliseconds,
  translate,
  onEdit,
  onDeleteForAll,
  onDeleteForMe,
}: GetMeetingActionEntriesParams): ContextMenuEntry[] => {
  const editEntry: ContextMenuEntry = {
    icon: () => <EditIcon />,
    label: translate(MEETING_ACTION_TRANSLATION_KEYS.editMeeting),
    click: onEdit,
  };

  const deleteForMeEntry: ContextMenuEntry = {
    css: contextMenuDangerItemStyles,
    icon: () => <CloseIcon css={contextMenuDangerItemIconStyles} />,
    label: translate(MEETING_ACTION_TRANSLATION_KEYS.deleteMeetingForMe),
    click: onDeleteForMe,
  };

  const deleteForAllEntry: ContextMenuEntry = {
    css: contextMenuDangerItemStyles,
    icon: () => <TrashIcon css={contextMenuDangerItemIconStyles} />,
    label: translate(MEETING_ACTION_TRANSLATION_KEYS.deleteMeetingForAll),
    click: onDeleteForAll,
  };

  const showDeleteForAll = canDeleteMeetingForAll(meetingInstance, selfUser, nowMilliseconds);
  const showDeleteForMe = canDeleteMeetingForMe(meetingInstance, selfUser, nowMilliseconds);

  return [
    ...(canEditMeeting(meetingInstance, selfUser, nowMilliseconds) ? [editEntry] : []),
    ...(showDeleteForAll ? [deleteForAllEntry] : []),
    ...(showDeleteForMe ? [deleteForMeEntry] : []),
  ];
};
