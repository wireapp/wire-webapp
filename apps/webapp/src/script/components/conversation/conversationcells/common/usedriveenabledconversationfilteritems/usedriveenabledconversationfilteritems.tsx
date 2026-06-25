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

import {CONVERSATION_ACCESS} from '@wireapp/api-client/lib/conversation/';
import {stringifyQualifiedId} from '@wireapp/core/lib/util/qualifiedIdUtil';

import {GroupAvatar} from 'Components/avatar';
import {ChannelAvatar} from 'Components/avatar';
import type {FilterItem} from 'Components/conversation/conversationcells/common/cellsfiltersbar/filterconfig';
import type {ConversationRepository} from 'Repositories/conversation/conversationrepository';
import type {Conversation} from 'Repositories/entity/conversation';
import {useChannelsFeatureFlag} from 'Util/usechannelsfeatureflag';

export const getDriveEnabledConversationFilterId = (conversation: Conversation): string =>
  stringifyQualifiedId(conversation.qualifiedId);

export const getDriveEnabledConversations = (conversationRepository: ConversationRepository): Conversation[] =>
  conversationRepository
    .getAllCellEnabledGroupConversations()
    .toSorted(
      (conversationA, conversationB) => conversationB.last_event_timestamp() - conversationA.last_event_timestamp(),
    );

const getConversationFilterStartContent = (conversation: Conversation, isChannelsEnabled: boolean) =>
  conversation.isChannel() && isChannelsEnabled ? (
    <ChannelAvatar
      conversationID={conversation.id}
      isLocked={conversation.accessModes?.includes(CONVERSATION_ACCESS.LINK) !== true}
      size="large"
    />
  ) : (
    <GroupAvatar conversationID={conversation.id} size="medium" />
  );

export const useDriveEnabledConversationFilterItems = ({
  conversationRepository,
}: {
  conversationRepository: ConversationRepository;
}): FilterItem[] => {
  const {isChannelsEnabled} = useChannelsFeatureFlag();

  return getDriveEnabledConversations(conversationRepository).map(conversation => ({
    id: getDriveEnabledConversationFilterId(conversation),
    label: conversation.display_name(),
    startContent: getConversationFilterStartContent(conversation, isChannelsEnabled),
  }));
};
