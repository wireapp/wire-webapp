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

import {Maybe} from 'true-myth';

import {PendingEnrollmentDataSchema} from './e2eiStorage.schema';

import {CoreDatabase} from '../../../../storage/coreDb';

type E2EIEnrollmentStorage = {
  /** Snapshot of an interrupted X509 credential acquisition, if one is in progress. */
  getPendingAcquisitionSnapshot(): Promise<Maybe<Uint8Array>>;
  savePendingAcquisitionSnapshot(acquisitionSnapshot: Uint8Array): Promise<void>;
  deletePendingAcquisitionSnapshot(): Promise<void>;
};

const PENDING_ENROLLMENT_TABLE = 'pendingEnrollmentData';
const STORAGE_KEY = 'data';

export function createE2EIEnrollmentStorage(coreDB: CoreDatabase): E2EIEnrollmentStorage {
  return {
    async getPendingAcquisitionSnapshot(): Promise<Maybe<Uint8Array>> {
      const data = await coreDB.get(PENDING_ENROLLMENT_TABLE, STORAGE_KEY);
      // Data written by the legacy enrollment flow cannot be resumed. Ignoring it lets the
      // caller start a fresh acquisition instead of failing on an unreadable record.
      const parsed = PendingEnrollmentDataSchema.safeParse(data);
      return parsed.success ? Maybe.just(parsed.data.acquisitionSnapshot) : Maybe.nothing();
    },
    async savePendingAcquisitionSnapshot(acquisitionSnapshot: Uint8Array): Promise<void> {
      // Copy the snapshot so the stored value always owns its buffer.
      await coreDB.put(
        PENDING_ENROLLMENT_TABLE,
        {acquisitionSnapshot: new Uint8Array(acquisitionSnapshot)},
        STORAGE_KEY,
      );
    },
    async deletePendingAcquisitionSnapshot(): Promise<void> {
      return coreDB.delete(PENDING_ENROLLMENT_TABLE, STORAGE_KEY);
    },
  };
}
