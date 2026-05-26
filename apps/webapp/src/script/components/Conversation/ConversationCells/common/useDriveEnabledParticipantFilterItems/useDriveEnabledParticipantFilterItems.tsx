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

import {stringifyQualifiedId} from '@wireapp/core/lib/util/qualifiedIdUtil';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import type {FilterItem} from 'Components/Conversation/ConversationCells/common/CellsFiltersBar/filterConfig';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import type {Conversation} from 'Repositories/entity/Conversation';
import type {User} from 'Repositories/entity/User';
import {matchQualifiedIds} from 'Util/qualifiedId';

export const getCreatedByFilterId = (user: User): string => stringifyQualifiedId(user.qualifiedId);

const sortConversationsByRecentFirst = (conversations: Conversation[]): Conversation[] =>
  conversations.toSorted(
    (conversationA, conversationB) => conversationB.last_event_timestamp() - conversationA.last_event_timestamp(),
  );

export const getDriveEnabledParticipants = (conversationRepository: ConversationRepository): User[] => {
  const participants: User[] = [];

  sortConversationsByRecentFirst(conversationRepository.getAllCellEnabledGroupConversations()).forEach(conversation => {
    conversation.allUserEntities().forEach(user => {
      if (!user.isAvailable() || user.isService) {
        return;
      }

      const alreadyAdded = participants.some(participant =>
        matchQualifiedIds(participant.qualifiedId, user.qualifiedId),
      );

      if (!alreadyAdded) {
        participants.push(user);
      }
    });
  });

  return participants;
};

export const useDriveEnabledParticipantFilterItems = ({
  conversationRepository,
}: {
  conversationRepository: ConversationRepository;
}): FilterItem[] =>
  getDriveEnabledParticipants(conversationRepository).map(user => ({
    id: getCreatedByFilterId(user),
    label: user.name(),
    subLabel: user.handle,
    startContent: <Avatar participant={user} avatarSize={AVATAR_SIZE.SMALL} />,
  }));
