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

import type {TeamInfo} from '../team/';
import type {QualifiedId} from '../user/';
import type {Conversation} from './Conversation';
import type {DefaultConversationRoleName} from './ConversationRole';
import type {RECEIPT_MODE} from './data/ConversationReceiptModeUpdateData';

export interface NewConversation
  extends Partial<Pick<Conversation, 'access' | 'access_role' | 'message_timer' | 'name'>> {
  conversation_role?: DefaultConversationRoleName;
  qualified_users?: QualifiedId[];
  receipt_mode: RECEIPT_MODE | null;
  team?: TeamInfo;
  users: string[];
}
