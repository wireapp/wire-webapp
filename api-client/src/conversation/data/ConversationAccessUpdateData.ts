/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {ACCESS_ROLE_V2, CONVERSATION_ACCESS, CONVERSATION_ACCESS_ROLE} from '../Conversation';

/**@deprecated */
export interface ConversationAccessUpdateData {
  access: CONVERSATION_ACCESS[];
  access_role: CONVERSATION_ACCESS_ROLE;
}

export interface ConversationAccessV2UpdateData {
  access: CONVERSATION_ACCESS[];
  access_role_v2: ACCESS_ROLE_V2[];
}
