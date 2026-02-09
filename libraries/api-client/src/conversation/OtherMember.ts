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

import {ConversationOtherMemberUpdateData} from './data';

import {QualifiedId} from '../user/QualifiedId';

import {ServiceRef} from './';

export interface OtherMember extends Partial<ConversationOtherMemberUpdateData> {
  /** The user ID. */
  id: string;
  qualified_id?: QualifiedId;
  /** The reference to the owning provider, if the member is a service. */
  service?: ServiceRef;
  /**
   * The member status. Currently this is always 0, indicating a regular member.
   * Other status values might be used in the future
   */
  status: SERVICE_MEMBER_STATUS;
}

export enum SERVICE_MEMBER_STATUS {
  REGULAR_MEMBER = 0,
}
