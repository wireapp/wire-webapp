/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {Conversation, MLSConversation, QualifiedUserClients, UserClients} from '@wireapp/api-client/lib/conversation/';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {QualifiedId} from '@wireapp/api-client/lib/user/';

export function isStringArray(obj: any): obj is string[] {
  return Array.isArray(obj) && (obj.length === 0 || typeof obj[0] === 'string');
}

function isQualifiedId(obj: any): obj is QualifiedId {
  return typeof obj === 'object' && typeof obj['domain'] === 'string';
}

export function isQualifiedIdArray(obj: any): obj is QualifiedId[] {
  return Array.isArray(obj) && isQualifiedId(obj[0]);
}

export function isQualifiedUserClients(obj: any): obj is QualifiedUserClients {
  if (typeof obj === 'object') {
    const firstUserClientObject = Object.values(obj)?.[0];
    if (typeof firstUserClientObject === 'object') {
      const firstClientIdArray = Object.values(firstUserClientObject as object)[0];
      return isStringArray(firstClientIdArray);
    }
  }
  return false;
}

export function isUserClients(obj: any): obj is UserClients {
  if (typeof obj === 'object') {
    const firstUserClientArray = Object.values(obj)?.[0];
    return isStringArray(firstUserClientArray);
  }
  return false;
}

export function isMLSConversation(conversation: Conversation): conversation is MLSConversation {
  const {protocol, epoch, group_id} = conversation;
  return protocol === CONVERSATION_PROTOCOL.MLS && epoch !== undefined && group_id !== undefined;
}
