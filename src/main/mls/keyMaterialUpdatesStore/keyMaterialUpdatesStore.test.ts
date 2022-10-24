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

import {keyMaterialUpdatesStore} from './keyMaterialUpdatesStore';
import {LastKeyMaterialUpdateParams} from '../../notification/types';

const mockUpdateEntries: LastKeyMaterialUpdateParams[] = [
  {groupId: 'group0', previousUpdateDate: 0},
  {groupId: 'group1', previousUpdateDate: 1},
];
// Storage Mock
function storageMock() {
  const storage: any = {};

  return {
    setItem: function (key: any, value: any) {
      storage[key] = value || '';
    },
    getItem: function (key: any) {
      return key in storage ? storage[key] : null;
    },
    removeItem: function (key: any) {
      delete storage[key];
    },
    get length() {
      return Object.keys(storage).length;
    },
    key: function (i: any) {
      const keys = Object.keys(storage);
      return keys[i] || null;
    },
  };
}

(global as any).localStorage = storageMock();

describe('keyMaterialUpdatesStore', () => {
  it('adds and retrieves items to/from dates store', () => {
    keyMaterialUpdatesStore.storeLastKeyMaterialUpdateDate(mockUpdateEntries[0]);
    expect(keyMaterialUpdatesStore.getAllUpdateDates()).toContainEqual(mockUpdateEntries[0]);

    keyMaterialUpdatesStore.storeLastKeyMaterialUpdateDate(mockUpdateEntries[1]);
    const stored = keyMaterialUpdatesStore.getAllUpdateDates();
    expect(stored).toContainEqual(mockUpdateEntries[1]);
    expect(stored).toContainEqual(mockUpdateEntries[0]);
    expect(stored).toHaveLength(2);
  });

  it('removes items from dates store', () => {
    keyMaterialUpdatesStore.storeLastKeyMaterialUpdateDate(mockUpdateEntries[0]);
    expect(keyMaterialUpdatesStore.getAllUpdateDates()).toContainEqual(mockUpdateEntries[0]);

    keyMaterialUpdatesStore.deleteLastKeyMaterialUpdateDate({groupId: mockUpdateEntries[0].groupId});

    expect(keyMaterialUpdatesStore.getAllUpdateDates()).not.toContainEqual(mockUpdateEntries[0]);
  });
});
