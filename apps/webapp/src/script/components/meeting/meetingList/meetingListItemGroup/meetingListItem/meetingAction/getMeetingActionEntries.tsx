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

import {isNullOrUndefined} from '@sindresorhus/is';

import {LinkIcon} from '../../../../../icon';
import {linkIconStyles} from './getMeetingActionEntries.styles';

import {
  contextMenuDangerItemIconStyles,
  contextMenuDangerItemStyles,
  contextMenuDisabledItemIconStyles,
} from './meetingAction.styles';
import {MEETING_ACTION_TRANSLATION_KEYS} from './meetingActionTranslationKeys';

import type {User} from '../../../../../../repositories/entity/User';
import type {ContextMenuEntry} from '../../../../../../ui/contextMenu';
import {CallIcon} from '../../../../../../uiKit/dataDisplay/icon/callIcon';
import {EditIcon} from '../../../../../../uiKit/dataDisplay/icon/editIcon';
import {TrashIcon} from '../../../../../../uiKit/dataDisplay/icon/trashIcon';
import type {Translate} from '../../../../../../util/localizerUtil';
import type {MeetingInstance} from '../../../../types/meetingInstance';
import {canDeleteMeetingForAll, canDeleteMeetingForMe} from '../../../../utils/canDeleteMeeting';
import {canEditMeeting} from '../../../../utils/canEditMeeting';

type GetMeetingActionEntriesParams = {
  meetingInstance: MeetingInstance;
  selfUser: User;
  nowMilliseconds: number;
  translate: Translate;
  onJoin: () => void;
  isJoinDisabled?: boolean;
  onEdit: () => void;
  onCopyMeetingLink: () => void;
  meetingLink?: string;
  onDeleteForAll: () => void;
  onDeleteForMe: () => void;
};

export const getMeetingActionEntries = ({
  meetingInstance,
  selfUser,
  nowMilliseconds,
  translate,
  onJoin,
  isJoinDisabled = false,
  onEdit,
  onCopyMeetingLink,
  meetingLink,
  onDeleteForAll,
  onDeleteForMe,
}: GetMeetingActionEntriesParams): ContextMenuEntry[] => {
  const joinEntry: ContextMenuEntry = {
    icon: () => {
      return <CallIcon css={isJoinDisabled ? contextMenuDisabledItemIconStyles : undefined} />;
    },
    label: translate(MEETING_ACTION_TRANSLATION_KEYS.joinNow),
    isDisabled: isJoinDisabled,
    click: onJoin,
  };

  const editEntry: ContextMenuEntry = {
    icon: () => {
      return <EditIcon />;
    },
    label: translate(MEETING_ACTION_TRANSLATION_KEYS.editMeeting),
    click: onEdit,
  };

  const copyMeetingLinkEntry: ContextMenuEntry = {
    icon: () => {
      return <LinkIcon css={linkIconStyles} />;
    },
    label: translate(MEETING_ACTION_TRANSLATION_KEYS.copyMeetingLink),
    click: onCopyMeetingLink,
  };

  const deleteForMeEntry: ContextMenuEntry = {
    css: contextMenuDangerItemStyles,
    icon: () => {
      return <TrashIcon css={contextMenuDangerItemIconStyles} />;
    },
    label: translate(MEETING_ACTION_TRANSLATION_KEYS.deleteMeetingForMe),
    click: onDeleteForMe,
  };

  const deleteForAllEntry: ContextMenuEntry = {
    css: contextMenuDangerItemStyles,
    icon: () => {
      return <TrashIcon css={contextMenuDangerItemIconStyles} />;
    },
    label: translate(MEETING_ACTION_TRANSLATION_KEYS.deleteMeetingForAll),
    click: onDeleteForAll,
  };

  const showDeleteForAll = canDeleteMeetingForAll(meetingInstance, selfUser);
  const showDeleteForMe = canDeleteMeetingForMe(meetingInstance, selfUser);

  return [
    joinEntry,
    ...(canEditMeeting(meetingInstance, selfUser, nowMilliseconds) ? [editEntry] : []),
    ...(isNullOrUndefined(meetingLink) ? [] : [copyMeetingLinkEntry]),
    ...(showDeleteForAll ? [deleteForAllEntry] : []),
    ...(showDeleteForMe ? [deleteForMeEntry] : []),
  ];
};
