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

import {Maybe, maybe} from 'true-myth';

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
  readonly setReviewing: (isReviewing: boolean) => void;
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
  const started = useRef<Maybe<StartedStatus>>(Maybe.nothing());
  const lastKind = useRef<Maybe<SharedDriveMoveStatusKind>>(Maybe.nothing());
  const isReviewing = useRef(false);

  // Stable, and always runs the latest callback, so the status published earlier never goes stale.
  const review = useCallback((): void => {
    onReviewRef.current?.();
  }, []);
  const hasReview = onReview !== undefined;

  // Stable so callers can list them as effect dependencies without re-publishing on every render.
  const start = useCallback(
    (items: readonly SharedDriveMoveItem[]): void => {
      const current = {id: createMoveStatusId(), items};
      started.current = Maybe.just(current);
      lastKind.current = Maybe.just('processing');
      isReviewing.current = false;
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
      if (maybe.isJust(started.current)) {
        const {id, items} = started.current.value;
        lastKind.current = Maybe.just(kind);
        updateMoveStatus({
          id,
          action,
          kind,
          items,
          destinationPath: '',
          isReviewing: isReviewing.current,
          ...(hasReview && {onReview: review}),
        });
      }
    },
    [action, hasReview, review, updateMoveStatus],
  );
  const setReviewing = useCallback(
    (reviewing: boolean): void => {
      isReviewing.current = reviewing;
      if (maybe.isJust(lastKind.current)) {
        report(lastKind.current.value);
      }
    },
    [report],
  );
  const clear = useCallback((): void => {
    if (maybe.isJust(started.current)) {
      clearMoveStatus(started.current.value.id);
      started.current = Maybe.nothing();
      lastKind.current = Maybe.nothing();
    }
  }, [clearMoveStatus]);
  const isProcessing = useCallback((): boolean => {
    return maybe.isJust(lastKind.current) && lastKind.current.value === 'processing';
  }, []);

  return {start, report, setReviewing, clear, isProcessing};
};
