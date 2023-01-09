/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {QualifiedId} from '@wireapp/api-client/lib/user';

const groupIdMap = new Map<string, string>();

function generateSubconversationId(parentConversation: QualifiedId, subconversation: string): string {
  return `${parentConversation.id}@${parentConversation.domain}:${subconversation}`;
}

export function storeSubconversationGroupId(
  parentConversation: QualifiedId,
  subconversation: string,
  subgroupId: string,
): void {
  const subconversationId = generateSubconversationId(parentConversation, subconversation);
  groupIdMap.set(subconversationId, subgroupId);
}

export function getGroupId(parentConversation: QualifiedId, subconversation: string): string | undefined {
  const subconversationId = generateSubconversationId(parentConversation, subconversation);
  return groupIdMap.get(subconversationId);
}
