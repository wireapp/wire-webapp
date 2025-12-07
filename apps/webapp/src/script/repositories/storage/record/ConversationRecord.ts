/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {
  CONVERSATION_ACCESS_ROLE,
  CONVERSATION_ACCESS,
  CONVERSATION_LEGACY_ACCESS_ROLE,
  CONVERSATION_TYPE,
  DefaultConversationRoleName,
  GROUP_CONVERSATION_TYPE,
  ADD_PERMISSION,
} from '@wireapp/api-client/lib/conversation';
import {RECEIPT_MODE} from '@wireapp/api-client/lib/conversation/data';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import type {QualifiedId} from '@wireapp/api-client/lib/user/';
import {CONVERSATION_READONLY_STATE} from 'Repositories/conversation/ConversationRepository';
import {ConversationStatus} from 'Repositories/conversation/ConversationStatus';
import {ConversationVerificationState} from 'Repositories/conversation/ConversationVerificationState';

import {LegalHoldStatus} from '@wireapp/protocol-messaging';

export interface ConversationRecord {
  access_role: CONVERSATION_LEGACY_ACCESS_ROLE | CONVERSATION_ACCESS_ROLE[];
  access: CONVERSATION_ACCESS[];
  archived_state: boolean;
  readonly_state: CONVERSATION_READONLY_STATE | null;
  archived_timestamp: number;
  cipher_suite: number;
  cleared_timestamp: number;
  creator: string;
  domain: string | null;
  ephemeral_timer: number;
  global_message_timer: number;
  group_id: string;
  group_conv_type?: GROUP_CONVERSATION_TYPE;
  add_permission?: ADD_PERMISSION;
  epoch: number;
  id: string;
  initial_protocol?: CONVERSATION_PROTOCOL;
  is_guest: boolean;
  last_event_timestamp: number;
  last_read_timestamp: number;
  last_server_timestamp: number;
  legal_hold_status: LegalHoldStatus;
  muted_state: number;
  muted_timestamp: number;
  name: string;
  others: string[];
  protocol: CONVERSATION_PROTOCOL;
  qualified_others: QualifiedId[];
  receipt_mode: RECEIPT_MODE | null;
  roles: {[userId: string]: DefaultConversationRoleName | string};
  status: ConversationStatus;
  team_id: string;
  type: CONVERSATION_TYPE;
  verification_state: ConversationVerificationState;
  mlsVerificationState: ConversationVerificationState;
}
