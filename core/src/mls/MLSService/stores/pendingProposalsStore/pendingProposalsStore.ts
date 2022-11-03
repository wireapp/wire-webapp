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

import {CommonMLS} from '../../../types';

export type PendingProposalsParams = {
  firingDate: number;
} & CommonMLS;

interface PendingProposalsStore {
  [groupId: string]: PendingProposalsParams;
}

const storageKey = 'pendingProposals';

const getAllItemsMap = (): PendingProposalsStore => {
  const storedState = localStorage.getItem(storageKey);
  if (!storedState) {
    return {};
  }
  return JSON.parse(storedState);
};

const getAllItems = (): PendingProposalsParams[] => {
  const storedStateMap = getAllItemsMap();
  return Object.values(storedStateMap);
};

const storeItem = ({groupId, firingDate}: PendingProposalsParams) => {
  const storedState = getAllItemsMap();
  const newStoredState = {...storedState, [groupId]: {groupId, firingDate}};
  localStorage.setItem(storageKey, JSON.stringify(newStoredState));
};

const deleteItem = ({groupId}: CommonMLS) => {
  const storedState = getAllItemsMap();
  if (storedState[groupId]) {
    delete storedState[groupId];
  }
  localStorage.setItem(storageKey, JSON.stringify(storedState));
};

export const pendingProposalsStore = {
  getAllItems,
  storeItem,
  deleteItem,
};
