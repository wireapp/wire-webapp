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

import type {ConversationMembers, ConversationProtocol} from './';
import type {QualifiedId} from '../user';
import type {RECEIPT_MODE} from './data';

export enum CONVERSATION_TYPE {
  REGULAR = 0,
  SELF = 1,
  ONE_TO_ONE = 2,
  CONNECT = 3,
}

export enum CONVERSATION_ACCESS_ROLE {
  ACTIVATED = 'activated',
  NON_ACTIVATED = 'non_activated',
  PRIVATE = 'private',
  TEAM = 'team',
}

export enum ACCESS_ROLE_V2 {
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

type UUID = string;
/**
 * A conversation object as returned from the server
 */
export interface Conversation {
  qualified_id: QualifiedId;
  /** @deprecated Use qualified_id instead */
  id: UUID;
  type: CONVERSATION_TYPE;
  creator: UUID;
  access: CONVERSATION_ACCESS[];

  /** How users can join conversations */
  /** @deprecated Use access_role_v2 instead */
  access_role: CONVERSATION_ACCESS_ROLE;
  access_role_v2: ACCESS_ROLE_V2[];
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

  protocol: ConversationProtocol;
}
