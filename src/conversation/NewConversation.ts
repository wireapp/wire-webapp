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

import {Conversation} from './Conversation';
import {DefaultConversationRoleName} from './ConversationRole';
import {RECEIPT_MODE} from './data/ConversationReceiptModeUpdateData';

import {TeamInfo} from '../team/';
import {QualifiedId} from '../user/';

export enum ConversationProtocol {
  MLS = 'mls',
  PROTEUS = 'proteus',
  MIXED = 'mixed',
}

export interface NewConversation
  extends Partial<
    Pick<
      Conversation,
      'access' | 'access_role' | 'access_role_v2' | 'message_timer' | 'name' | 'group_conv_type' | 'add_permission'
    >
  > {
  conversation_role?: DefaultConversationRoleName;
  qualified_users?: QualifiedId[];
  receipt_mode: RECEIPT_MODE | null;
  protocol?: ConversationProtocol;
  team?: TeamInfo;
  /** users must be empty for creating MLS conversations */
  users?: string[];
  cells?: boolean;
  /** When set to true on a channel creation request, the creator will not be a member of the conversation. */
  skip_creator?: boolean;
}
