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

import {faker} from '@faker-js/faker';
import {ConnectionStatus} from '@wireapp/api-client/lib/connection/';
import {CONVERSATION_TYPE, CONVERSATION_ACCESS_ROLE} from '@wireapp/api-client/lib/conversation/';
import {RECEIPT_MODE} from '@wireapp/api-client/lib/conversation/data';
import {ConversationProtocol} from '@wireapp/api-client/lib/conversation/NewConversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {LegalHoldStatus} from '@wireapp/core/lib/conversation/content';

import {ConnectionEntity} from 'src/script/connection/ConnectionEntity';
import {ConversationDatabaseData, ConversationMapper} from 'src/script/conversation/ConversationMapper';
import {ConversationStatus} from 'src/script/conversation/ConversationStatus';
import {ConversationVerificationState} from 'src/script/conversation/ConversationVerificationState';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import {createUuid} from 'Util/uuid';

export function generateAPIConversation(
  id: QualifiedId = {id: createUuid(), domain: 'test.wire.link'},
  conversationType = CONVERSATION_TYPE.REGULAR,
  conversationProtocol = ConversationProtocol.PROTEUS,
  overwites?: Partial<ConversationDatabaseData>,
): ConversationDatabaseData {
  return {
    id: id.id,
    name: faker.person.fullName(),
    type: conversationType,
    protocol: conversationProtocol,
    qualified_id: id,
    access: [],
    verification_state: ConversationVerificationState.UNVERIFIED,
    receipt_mode: RECEIPT_MODE.ON,
    team_id: '',
    status: ConversationStatus.CURRENT_MEMBER,
    is_guest: false,
    archived_state: false,
    is_managed: false,
    archived_timestamp: 0,
    last_event_timestamp: 0,
    last_read_timestamp: 0,
    last_server_timestamp: 0,
    cleared_timestamp: 0,
    ephemeral_timer: 0,
    roles: {},
    muted_state: 0,
    muted_timestamp: 0,
    others: [],
    qualified_others: [],
    legal_hold_status: LegalHoldStatus.DISABLED,
    global_message_timer: 0,
    group_id: '',
    cipher_suite: 0,
    epoch: 0,
    domain: id.domain,
    creator: '',
    access_role: [CONVERSATION_ACCESS_ROLE.TEAM_MEMBER],
    ...overwites,
  };
}

export function generateConversation(
  conversationType = CONVERSATION_TYPE.REGULAR,
  connectionStatus = ConnectionStatus.ACCEPTED,
  conversationProtocol = ConversationProtocol.PROTEUS,
  id?: QualifiedId,
  users?: User[],
  overwites?: Partial<ConversationDatabaseData>,
): Conversation {
  const apiConversation = generateAPIConversation(id, conversationType, conversationProtocol, overwites);

  const conversation = ConversationMapper.mapConversations([apiConversation])[0];
  const connectionEntity = new ConnectionEntity();
  connectionEntity.conversationId = conversation.qualifiedId;
  connectionEntity.status(connectionStatus);
  conversation.connection(connectionEntity);
  conversation.type(conversationType);

  if (conversationProtocol === ConversationProtocol.MLS) {
    conversation.groupId = 'groupId';
  }

  if (users) {
    conversation.participating_user_ets(users);
  }

  return conversation;
}
