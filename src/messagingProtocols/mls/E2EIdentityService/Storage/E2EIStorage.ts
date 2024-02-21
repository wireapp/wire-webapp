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

import {EnrollmentFlowData} from './E2EIStorage.schema';

import {CoreDatabase} from '../../../../storage/CoreDB';

const PENDING_ENROLLMENT_TABLE = 'pendingEnrollmentData';
const STORAGE_KEY = 'data';

export function createE2EIEnrollmentStorage(coreDB: CoreDatabase) {
  return {
    async getPendingEnrollmentData(): Promise<EnrollmentFlowData | undefined> {
      return coreDB.get(PENDING_ENROLLMENT_TABLE, STORAGE_KEY);
    },
    async savePendingEnrollmentData(data: EnrollmentFlowData): Promise<void> {
      await coreDB.put(PENDING_ENROLLMENT_TABLE, data, STORAGE_KEY);
    },
    async deletePendingEnrollmentData(): Promise<void> {
      return coreDB.delete(PENDING_ENROLLMENT_TABLE, STORAGE_KEY);
    },
  };
}
