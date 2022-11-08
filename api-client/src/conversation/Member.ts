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

import {QualifiedId} from '../user';

import {DefaultConversationRoleName, MutedStatus, ServiceRef} from './';

export interface Member {
  /**
   * Role name, between 2 and 128 chars, 'wire_' prefix is reserved for
   * roles designed by Wire (i.e., no custom roles can have the same prefix).
   * @see `DefaultConversationRoleName`
   */
  conversation_role?: DefaultConversationRoleName | string;
  /** Whether the conversation with this user is hidden */
  hidden?: boolean;
  /** A reference point for (un)hiding */
  hidden_ref: string | null;
  id: string;
  /** Whether to notify on conversation updates for this user */
  otr_archived?: boolean;
  /** A reference point for (un)archiving */
  otr_archived_ref: string | null;
  otr_muted_ref: string | null;
  otr_muted_status: MutedStatus | null;
  service: ServiceRef | null;
  status_ref: string;
  status_time: string;
  qualified_id?: QualifiedId;
}
