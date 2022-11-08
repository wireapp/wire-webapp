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

import {QualifiedId, User} from '../../user';
import {DefaultConversationRoleName} from '../ConversationRole';
import {Member} from '../Member';
import {OtherMember} from '../OtherMember';

export interface MlsEvent {
  conversation: string;
  data: MlsEventData;
  from: string;
  qualified_conversation: QualifiedId;
  qualified_from: QualifiedId;
  time: string;
  type: string;
}

export interface MlsEventData {
  access: string[];
  access_role: string;
  access_role_v2: string[];
  code: string;
  conversation_role: string;
  creator: string;
  data: string;
  email: string;
  epoch: number;
  group_id: string;
  hidden: boolean;
  hidden_ref: string;
  id: string;
  key: string;
  last_event: string;
  last_event_time: string;
  members: {
    others: OtherMember[];
    self: Member & {
      qualified_id: QualifiedId;
      status: string;
    };
  };
  message: string;
  message_timer: number;
  name: string;
  otr_archived: boolean;
  otr_archived_ref: string;
  otr_muted_ref: string;
  otr_muted_status: number;
  protocol: string;
  qualified_id: QualifiedId;
  qualified_recipient: QualifiedId;
  qualified_target: QualifiedId;
  qualified_user_ids: QualifiedId[];
  receipt_mode: number;
  recipient: string;
  sender: string;
  status: string;
  target: string;
  team: string;
  text: string;
  type: number;
  uri: string;
  user_ids: string[];
  users: (Pick<User, 'id' | 'qualified_id'> & {conversation_role: DefaultConversationRoleName})[];
}
