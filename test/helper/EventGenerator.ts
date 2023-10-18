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

import {AssetTransferState} from 'src/script/assets/AssetTransferState';
import {AssetAddEvent, DeleteEvent, EventBuilder, MessageAddEvent} from 'src/script/conversation/EventBuilder';
import {Conversation} from 'src/script/entity/Conversation';
import {CONVERSATION} from 'src/script/event/Client';
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
  const baseEvent = EventBuilder.buildMessageAdd(conversation, Date.now(), createUuid(), 'clientId');
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

/**
 * will simulate en event that has been saved to the DB
 * @param event
 * @returns
 */
export function toSavedEvent(event: MessageAddEvent | AssetAddEvent) {
  return {
    primary_key: createUuid(),
    category: 1,
    ...event,
  };
}
