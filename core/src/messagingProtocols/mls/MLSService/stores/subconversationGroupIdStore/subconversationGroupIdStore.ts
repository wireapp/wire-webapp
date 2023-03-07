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

const generateSubconversationStoreKey = (
  parentConversationId: QualifiedId,
  subconversationId: SUBCONVERSATION_ID,
): `${string}@${string}:${SUBCONVERSATION_ID}` => {
  return `${parentConversationId.id}@${parentConversationId.domain}:${subconversationId}`;
};

const parseSubconversationStoreKey = (
  subconversationStoreKey: string,
): {parentConversationId: QualifiedId; subconversationId: SUBCONVERSATION_ID} => {
  const [parentConversationId, subconversationId] = subconversationStoreKey.split(':') as [string, SUBCONVERSATION_ID];
  const [id, domain] = parentConversationId.split('@');
  return {parentConversationId: {domain, id}, subconversationId};
};

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

const storeGroupId = (
  parentConversationId: QualifiedId,
  subconversationId: SUBCONVERSATION_ID,
  subconversationGroupId: string,
) => {
  const subconversationStoreKey = generateSubconversationStoreKey(parentConversationId, subconversationId);
  addItemToMap(subconversationStoreKey, subconversationGroupId);
};

const getGroupId = (parentConversationId: QualifiedId, subconversationId: SUBCONVERSATION_ID) => {
  const subconversationStoreKey = generateSubconversationStoreKey(parentConversationId, subconversationId);
  return getCurrentMap().get(subconversationStoreKey);
};

const getAllGroupIdsBySubconversationId = (subconversationIdQuery: SUBCONVERSATION_ID) => {
  return Array.from(getCurrentMap().entries())
    .map(([subconversationId, subconversationGroupId]) => ({
      ...parseSubconversationStoreKey(subconversationId),
      subconversationGroupId,
    }))
    .filter(({subconversationId}) => subconversationId === subconversationIdQuery);
};

const removeGroupId = (parentConversationId: QualifiedId, subconversationId: SUBCONVERSATION_ID) => {
  const subconversationStoreKey = generateSubconversationStoreKey(parentConversationId, subconversationId);
  return removeItemFromMap(subconversationStoreKey);
};

export const subconversationGroupIdStore = {
  storeGroupId,
  getGroupId,
  removeGroupId,
  getAllGroupIdsBySubconversationId,
};
