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

import {SUBCONVERSATION_ID} from '@wireapp/api-client/lib/conversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';

const storageKey = 'subconversationGroupIdStore';

function generateSubconversationId(
  parentConversation: QualifiedId,
  subconversation: SUBCONVERSATION_ID,
): `${string}@${string}:${SUBCONVERSATION_ID}` {
  return `${parentConversation.id}@${parentConversation.domain}:${subconversation}`;
}

function parseSubconversationId(subconversationId: string): {parentConversation: QualifiedId; subconversation: string} {
  const [parentConversationId, subconversation] = subconversationId.split(':');
  const [id, domain] = parentConversationId.split('@');
  return {parentConversation: {domain, id}, subconversation};
}

const getCurrentMap = (): Map<string, string> => {
  const storedEntry = localStorage.getItem(storageKey);
  return storedEntry ? new Map<string, string>(JSON.parse(storedEntry)) : new Map<string, string>();
};

const addItemToMap = (subconversationId: string, subgroupId: string) => {
  const currentMap = getCurrentMap();
  currentMap.set(subconversationId, subgroupId);
  localStorage.setItem(storageKey, JSON.stringify(Array.from(currentMap.entries())));
};

const removeItemFromMap = (subconversationId: string) => {
  const currentMap = getCurrentMap();
  currentMap.delete(subconversationId);
  localStorage.setItem(storageKey, JSON.stringify(Array.from(currentMap.entries())));
};

function storeGroupId(parentConversation: QualifiedId, subconversation: SUBCONVERSATION_ID, subgroupId: string): void {
  const subconversationId = generateSubconversationId(parentConversation, subconversation);
  addItemToMap(subconversationId, subgroupId);
}

function getGroupId(parentConversation: QualifiedId, subconversation: SUBCONVERSATION_ID): string | undefined {
  const subconversationId = generateSubconversationId(parentConversation, subconversation);
  return getCurrentMap().get(subconversationId);
}

function getAllGroupIdsBySubconversationId(subconversationId: SUBCONVERSATION_ID) {
  return Array.from(getCurrentMap().entries())
    .map(([subconversationId, subconversationGroupId]) => ({
      ...parseSubconversationId(subconversationId),
      subconversationGroupId,
    }))
    .filter(({subconversation}) => subconversation === subconversationId);
}

function removeGroupId(parentConversation: QualifiedId, subconversation: SUBCONVERSATION_ID) {
  const subconversationId = generateSubconversationId(parentConversation, subconversation);
  return removeItemFromMap(subconversationId);
}

export const subconversationGroupIdStore = {
  storeGroupId,
  getGroupId,
  removeGroupId,
  getAllGroupIdsBySubconversationId,
};
