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

import {useCallback, useRef} from 'react';

import {
  useSharedDriveUploadStatus,
  type SharedDriveBulkAction,
  type SharedDriveMoveItem,
  type SharedDriveMoveStatusKind,
} from './sharedDriveUploadStatusContext';

interface StartedStatus {
  readonly id: string;
  readonly items: readonly SharedDriveMoveItem[];
}

export interface BulkActionStatusReporter {
  readonly start: (items: readonly SharedDriveMoveItem[]) => void;
  readonly report: (kind: SharedDriveMoveStatusKind) => void;
  readonly clear: () => void;
  readonly isProcessing: () => boolean;
}

/**
 * Shows the progress and outcome of a bulk action in the shared bottom status popup.
 * Bulk actions without a destination (restore, delete) report an empty destination path.
 * When `onReview` is given, every reported status carries it so the popup can offer it once an outcome needs review.
 */
export const useBulkActionStatusReporter = (
  action: SharedDriveBulkAction,
  onReview?: () => void,
): BulkActionStatusReporter => {
  const {updateMoveStatus, createMoveStatusId, clearMoveStatus} = useSharedDriveUploadStatus();
  const onReviewRef = useRef(onReview);
  onReviewRef.current = onReview;
  const started = useRef<StartedStatus | null>(null);
  const lastKind = useRef<SharedDriveMoveStatusKind | null>(null);

  // Stable, and always runs the latest callback, so the status published earlier never goes stale.
  const review = useCallback((): void => {
    onReviewRef.current?.();
  }, []);
  const hasReview = onReview !== undefined;

  // Stable so callers can list them as effect dependencies without re-publishing on every render.
  const start = useCallback(
    (items: readonly SharedDriveMoveItem[]): void => {
      const current = {id: createMoveStatusId(), items};
      started.current = current;
      lastKind.current = 'processing';
      updateMoveStatus({
        id: current.id,
        action,
        kind: 'processing',
        items,
        destinationPath: '',
        ...(hasReview && {onReview: review}),
      });
    },
    [action, createMoveStatusId, hasReview, review, updateMoveStatus],
  );
  const report = useCallback(
    (kind: SharedDriveMoveStatusKind): void => {
      if (started.current !== null) {
        lastKind.current = kind;
        updateMoveStatus({
          id: started.current.id,
          action,
          kind,
          items: started.current.items,
          destinationPath: '',
          ...(hasReview && {onReview: review}),
        });
      }
    },
    [action, hasReview, review, updateMoveStatus],
  );
  const clear = useCallback((): void => {
    if (started.current !== null) {
      clearMoveStatus(started.current.id);
      started.current = null;
      lastKind.current = null;
    }
  }, [clearMoveStatus]);
  const isProcessing = useCallback((): boolean => {
    return lastKind.current === 'processing';
  }, []);

  return {start, report, clear, isProcessing};
};
