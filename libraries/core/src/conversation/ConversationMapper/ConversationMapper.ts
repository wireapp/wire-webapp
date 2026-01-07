/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {CONVERSATION_EVENT, ConversationEvent} from '@wireapp/api-client/lib/event';

import {NotificationSource} from '../../notification';
import {MessageSendingState} from '../message';
import {createId} from '../message/MessageBuilder';
import {PayloadBundle, PayloadBundleType} from '../message/PayloadBundle';
export class ConversationMapper {
  public static mapConversationEvent(event: ConversationEvent, source: NotificationSource): PayloadBundle {
    return {
      content: event.data,
      conversation: event.conversation,
      qualifiedConversation: event.qualified_conversation,
      qualifiedFrom: event.qualified_from,
      from: event.from,
      id: createId(),
      messageTimer: 0,
      source,
      state: MessageSendingState.INCOMING,
      timestamp: new Date(event.time).getTime(),
      type: this.mapConversationEventType(event.type),
    };
  }

  private static mapConversationEventType(type: CONVERSATION_EVENT): PayloadBundleType {
    switch (type) {
      case CONVERSATION_EVENT.MEMBER_JOIN:
        return PayloadBundleType.MEMBER_JOIN;
      case CONVERSATION_EVENT.MESSAGE_TIMER_UPDATE:
        return PayloadBundleType.TIMER_UPDATE;
      case CONVERSATION_EVENT.RENAME:
        return PayloadBundleType.CONVERSATION_RENAME;
      case CONVERSATION_EVENT.TYPING:
        return PayloadBundleType.TYPING;
      default:
        return PayloadBundleType.UNKNOWN;
    }
  }
}
