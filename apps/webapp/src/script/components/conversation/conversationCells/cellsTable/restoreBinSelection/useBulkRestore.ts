/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {useEffect, useState, useSyncExternalStore} from 'react';

import {
  createBulkRestoreController,
  type BulkRestoreOptions,
  type BulkRestoreReviewReason,
  type BulkRestoreSnapshot,
} from './bulkRestoreController';
import type {RestoreTarget} from './resolveRestoreTargets';

import type {SharedDriveMoveStatus} from '../../sharedDriveUploadStatusContext';

export type UseBulkRestoreOptions = BulkRestoreOptions;
export type {BulkRestoreReviewReason};

export interface BulkRestoreState extends BulkRestoreSnapshot {
  readonly restore: (
    targets: readonly RestoreTarget[],
    scopeKey: string,
    status: SharedDriveMoveStatus,
  ) => Promise<void>;
  readonly refreshReview: () => Promise<void>;
  readonly resumeReview: (reason: BulkRestoreReviewReason) => void;
  readonly reset: () => void;
}

export const useBulkRestore = (options: UseBulkRestoreOptions): BulkRestoreState => {
  const [controller] = useState(() => {
    return createBulkRestoreController(options);
  });
  controller.setOptions(options);
  useEffect(() => {
    controller.mount();
    return controller.dispose;
  }, [controller]);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  return {
    ...snapshot,
    restore: controller.restore,
    refreshReview: controller.refreshReview,
    resumeReview: controller.resumeReview,
    reset: controller.reset,
  };
};
