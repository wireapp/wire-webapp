/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {MemberLeaveReason} from '@wireapp/api-client/lib/conversation/data/';
import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event';
import {AssetTransferState} from 'Repositories/assets/AssetTransferState';
import {
  AssetAddEvent,
  DeleteEvent,
  EventBuilder,
  GroupCreationEvent,
  MemberLeaveEvent,
  MessageAddEvent,
  MultipartMessageAddEvent,
  ReactionEvent,
} from 'Repositories/conversation/EventBuilder';
import {Conversation} from 'Repositories/entity/Conversation';
import {CONVERSATION} from 'Repositories/event/Client';
import {StatusType} from 'src/script/message/StatusType';
import {createUuid} from 'Util/uuid';

export function createMessageAddEvent({
  text = '',
  overrides = {},
  dataOverrides = {},
}: {
  text?: string;
  overrides?: Partial<MessageAddEvent>;
  dataOverrides?: Partial<MessageAddEvent['data']>;
} = {}): MessageAddEvent {
  const from = createUuid();
  const conversation = new Conversation(createUuid(), 'domain');
  const baseEvent = EventBuilder.buildMessageAdd({
    conversationEntity: conversation,
    currentTimestamp: Date.now(),
    senderId: createUuid(),
    clientId: 'clientId',
  });
  return {
    ...baseEvent,
    data: {
      ...baseEvent.data,
      content: text,
      previews: [],
      ...dataOverrides,
    },
    from,
    ...overrides,
  };
}

export function createMultipartMessageAddEvent({
  text = '',
  overrides = {},
  dataOverrides = {},
}: {
  text?: string;
  overrides?: Partial<MultipartMessageAddEvent>;
  dataOverrides?: Partial<MultipartMessageAddEvent['data']>;
} = {}): MultipartMessageAddEvent {
  const from = createUuid();
  const conversation = new Conversation(createUuid(), 'domain');
  return {
    conversation: conversation.id,
    data: {
      attachments: [],
      text: {
        content: text,
      },
      ...dataOverrides,
    },
    from,
    status: StatusType.SENDING,
    id: createUuid(),
    time: new Date().toISOString(),
    type: CONVERSATION.MULTIPART_MESSAGE_ADD,
    ...overrides,
  };
}

export function createReactionEvent(targetMessageId: string, reaction: string = '👍'): ReactionEvent {
  return {
    conversation: createUuid(),
    data: {
      message_id: targetMessageId,
      reaction,
    },
    from: createUuid(),
    id: createUuid(),
    time: new Date().toISOString(),
    type: CONVERSATION.REACTION,
  };
}

export function createMemberLeaveEvent(conversationId: string, userIds: string[]): MemberLeaveEvent {
  const conversationQualifiedId = {id: conversationId, domain: ''};

  return {
    conversation: conversationId,
    qualified_conversation: conversationQualifiedId,
    data: {
      qualified_user_ids: userIds.map(userId => ({id: userId, domain: ''})),
      reason: MemberLeaveReason.USER_DELETED,
      user_ids: userIds,
    },
    from: createUuid(),
    id: createUuid(),
    time: new Date().toISOString(),
    type: CONVERSATION_EVENT.MEMBER_LEAVE,
  };
}

export function createDeleteEvent(deleteMessageId: string, conversationId: string = createUuid()): DeleteEvent {
  return {
    conversation: conversationId,
    data: {
      deleted_time: 0,
      message_id: deleteMessageId,
      time: '',
    },
    from: createUuid(),
    id: createUuid(),
    qualified_conversation: {domain: '', id: conversationId},
    time: new Date().toISOString(),
    type: CONVERSATION.MESSAGE_DELETE,
  };
}

export function createAssetAddEvent(overrides: Partial<AssetAddEvent> = {}): AssetAddEvent {
  const from = createUuid();
  return {
    conversation: createUuid(),
    data: {
      content_type: '',
      content_length: 0,
      status: AssetTransferState.UPLOADING,
      info: {name: 'test.png'},
    },
    from,
    id: createUuid(),
    time: new Date().toISOString(),
    type: CONVERSATION.ASSET_ADD,
    ...overrides,
  };
}

export function createGroupCreationEvent(overrides: Partial<GroupCreationEvent>): GroupCreationEvent {
  return {
    conversation: createUuid(),
    data: {
      userIds: [],
      allTeamMembers: false,
      name: '',
    },
    from: createUuid(),
    id: createUuid(),
    time: new Date().toISOString(),
    type: CONVERSATION.GROUP_CREATION,
    ...overrides,
  };
}

/**
 * will simulate en event that has been saved to the DB
 * @param event
 * @returns
 */
export function toSavedEvent<T extends MessageAddEvent | MultipartMessageAddEvent | AssetAddEvent>(
  event: T,
): T & {primary_key: string; category: number} {
  return {
    primary_key: createUuid(),
    category: 1,
    ...event,
  };
}
