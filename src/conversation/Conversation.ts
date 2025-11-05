/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {RECEIPT_MODE} from './data';

import {MLSPublicKeyRecord} from '../client';
import {CONVERSATION_PROTOCOL} from '../team';
import {QualifiedId} from '../user';

import {ConversationMembers} from './';

export enum CONVERSATION_TYPE {
  REGULAR = 0,
  SELF = 1,
  ONE_TO_ONE = 2,
  CONNECT = 3,
  GLOBAL_TEAM = 4,
}

export enum CONVERSATION_LEGACY_ACCESS_ROLE {
  ACTIVATED = 'activated',
  NON_ACTIVATED = 'non_activated',
  PRIVATE = 'private',
  TEAM = 'team',
}

export enum CONVERSATION_ACCESS_ROLE {
  TEAM_MEMBER = 'team_member',
  SERVICE = 'service',
  NON_TEAM_MEMBER = 'non_team_member',
  GUEST = 'guest',
}

export enum CONVERSATION_ACCESS {
  CODE = 'code',
  INVITE = 'invite',
  LINK = 'link',
  PRIVATE = 'private',
}

export enum GROUP_CONVERSATION_TYPE {
  CHANNEL = 'channel',
  GROUP_CONVERSATION = 'group_conversation',
}

export enum ADD_PERMISSION {
  EVERYONE = 'everyone',
  ADMINS = 'admins',
}

export enum CONVERSATION_CELLS_STATE {
  DISABLED = 'disabled',
  PENDING = 'pending',
  READY = 'ready',
}

type UUID = string;
/**
 * A conversation object as returned from the server
 */
export interface Conversation {
  qualified_id: QualifiedId;
  type: CONVERSATION_TYPE;
  creator: UUID;
  cells_state: CONVERSATION_CELLS_STATE;
  access: CONVERSATION_ACCESS[];
  group_conv_type?: GROUP_CONVERSATION_TYPE;
  add_permission?: ADD_PERMISSION;
  /** How users can join conversations */
  //CONVERSATION_ACCESS_ROLE for api <= v2, ACCESS_ROLE_V2[] since api v3
  access_role: CONVERSATION_LEGACY_ACCESS_ROLE | CONVERSATION_ACCESS_ROLE[];
  /** @deprecated Use access_role instead */
  access_role_v2?: CONVERSATION_ACCESS_ROLE[];
  name?: string;
  last_event?: string;
  last_event_time?: string;
  team?: UUID;

  /**
   * Per-conversation message timer (can be null)
   * @format int64
   * @min -9223372036854776000
   * @max 9223372036854776000
   */
  message_timer?: number;

  /**
   * Conversation receipt mode
   * @format int32
   * @min -2147483648
   * @max 2147483647
   */
  receipt_mode?: RECEIPT_MODE;

  /** Users of a conversation */
  members: ConversationMembers;

  /** MLS conversations only */
  group_id?: string;
  epoch?: number;
  cipher_suite?: number;

  protocol: CONVERSATION_PROTOCOL;
}

export interface MLSConversation extends Conversation {
  group_id: string;
  epoch: number;
  cipher_suite: number;
  protocol: CONVERSATION_PROTOCOL.MLS;
}

export interface MLS1to1Conversation {
  conversation: MLSConversation;
  public_keys?: {
    removal: MLSPublicKeyRecord;
  };
}

export function isMLS1to1Conversation(response: unknown): response is MLS1to1Conversation {
  if (typeof response === 'object' && response !== null && 'conversation' in response && 'public_keys' in response) {
    return true;
  }

  return false;
}
