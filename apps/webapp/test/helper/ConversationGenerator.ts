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

import {ConnectionStatus} from '@wireapp/api-client/lib/connection/';
import {
  CONVERSATION_TYPE,
  CONVERSATION_ACCESS_ROLE,
  Conversation as BackendConversation,
  Member,
} from '@wireapp/api-client/lib/conversation/';
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

interface GenerateAPIConversationParams {
  id?: QualifiedId;
  type?: CONVERSATION_TYPE;
  protocol?: ConversationProtocol;
  overwites?: Partial<ConversationDatabaseData>;
  name?: string;
  groupId?: string;
}

export function generateAPIConversation({
  id = {id: createUuid(), domain: 'test.wire.link'},
  type = CONVERSATION_TYPE.REGULAR,
  protocol = ConversationProtocol.PROTEUS,
  overwites = {},
  name,
}: GenerateAPIConversationParams): BackendConversation {
  return {
    id: id.id,
    name,
    type: type,
    protocol: protocol,
    qualified_id: id,
    access: [],
    verification_state: ConversationVerificationState.UNVERIFIED,
    mlsVerificationState: ConversationVerificationState.UNVERIFIED,
    receipt_mode: RECEIPT_MODE.ON,
    team_id: '',
    status: ConversationStatus.CURRENT_MEMBER,
    is_guest: false,
    archived_state: false,
    readonly_state: null,
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
    members: {others: [], self: {} as Member},
    ...overwites,
  };
}

interface GenerateConversationParams extends GenerateAPIConversationParams {
  users?: User[];
  status?: ConnectionStatus;
}

export function generateConversation({
  type = CONVERSATION_TYPE.REGULAR,
  status = ConnectionStatus.ACCEPTED,
  protocol = ConversationProtocol.PROTEUS,
  id,
  name,
  groupId = 'groupId',
  users = [],
  overwites = {},
}: GenerateConversationParams = {}): Conversation {
  const apiConversation = generateAPIConversation({id, type, protocol, name, overwites});

  const conversation = ConversationMapper.mapConversations([apiConversation as ConversationDatabaseData])[0];
  const connectionEntity = new ConnectionEntity();
  connectionEntity.conversationId = conversation.qualifiedId;
  connectionEntity.status(status);
  conversation.connection(connectionEntity);
  conversation.type(type);

  if ([ConversationProtocol.MLS, ConversationProtocol.MIXED].includes(protocol)) {
    conversation.groupId = groupId;
  }

  if (users) {
    conversation.participating_user_ets(users);
    conversation.participating_user_ids(users.map(user => user.qualifiedId));
  }

  return conversation;
}
