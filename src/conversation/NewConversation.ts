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

import {TeamInfo} from '../team/';
import {QualifiedId} from '../user/';
import {Conversation} from './Conversation';
import {DefaultConversationRoleName} from './ConversationRole';
import {RECEIPT_MODE} from './data/ConversationReceiptModeUpdateData';

export enum ConversationProtocol {
  MLS = 'mls',
  PROTEUS = 'proteus',
}

export interface NewConversation
  extends Partial<Pick<Conversation, 'access' | 'access_role' | 'access_role_v2' | 'message_timer' | 'name'>> {
  conversation_role?: DefaultConversationRoleName;
  qualified_users?: QualifiedId[];
  receipt_mode: RECEIPT_MODE | null;
  protocol?: ConversationProtocol;
  team?: TeamInfo;
  users?: string[]; // users must be empty for creating MLS conversations
  creator_client?: string; // client id of self user, used for creating MLS conversations
  selfUserId?: QualifiedId;
}
