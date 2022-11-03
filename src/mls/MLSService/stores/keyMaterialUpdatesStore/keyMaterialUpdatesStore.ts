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

export type LastKeyMaterialUpdateParams = CommonMLS;
export interface KeyMaterialUpdatesStore {
  [groupId: string]: LastKeyMaterialUpdateParams;
}

const storageKey = 'keyMaterialUpdates';

const getUpdateDatesMap = (): KeyMaterialUpdatesStore => {
  const storedState = localStorage.getItem(storageKey);
  if (!storedState) {
    return {};
  }
  return JSON.parse(storedState);
};

const getAllUpdateDates = (): LastKeyMaterialUpdateParams[] => {
  const storedStateMap = getUpdateDatesMap();
  return Object.values(storedStateMap);
};

const storeLastKeyMaterialUpdateDate = ({groupId}: LastKeyMaterialUpdateParams) => {
  const storedState = getUpdateDatesMap();
  const newStoredState = {...storedState, [groupId]: {groupId}};
  localStorage.setItem(storageKey, JSON.stringify(newStoredState));
};

const deleteLastKeyMaterialUpdateDate = ({groupId}: CommonMLS) => {
  const storedState = getUpdateDatesMap();
  if (storedState[groupId]) {
    delete storedState[groupId];
  }
  localStorage.setItem(storageKey, JSON.stringify(storedState));
};

export const keyMaterialUpdatesStore = {
  getAllUpdateDates,
  storeLastKeyMaterialUpdateDate,
  deleteLastKeyMaterialUpdateDate,
};
