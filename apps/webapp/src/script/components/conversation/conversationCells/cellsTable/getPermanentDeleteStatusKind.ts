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

import {Maybe} from 'true-myth';

import type {PermanentDeleteReviewReason} from './usePermanentDeleteReconciliation';

import type {SharedDriveMoveStatusKind} from '../sharedDriveUploadStatusContext';

interface PermanentDeleteStatusInput {
  readonly isPending: boolean;
  readonly isRejected: boolean;
  readonly isUnresolved: boolean;
  readonly isReconciling: boolean;
  readonly reviewReason: PermanentDeleteReviewReason | null;
}

const kindByReviewReason: Readonly<Record<PermanentDeleteReviewReason, SharedDriveMoveStatusKind>> = {
  'job-failed': 'failed',
  'refresh-failed': 'finished-unknown',
  'still-visible': 'partial',
  'timed-out': 'status-unknown',
};

/**
 * Maps the permanent-delete reconciliation flags to the popup status kind, or nothing when no status should be shown.
 * Completion is reported separately by the hook's completion callbacks.
 */
export const getPermanentDeleteStatusKind = ({
  isPending,
  isRejected,
  isUnresolved,
  isReconciling,
  reviewReason,
}: PermanentDeleteStatusInput): Maybe<SharedDriveMoveStatusKind> => {
  if (isPending || (isUnresolved && isReconciling)) {
    return Maybe.just('processing');
  }
  if (isUnresolved) {
    return Maybe.just(reviewReason === null ? 'status-unknown' : kindByReviewReason[reviewReason]);
  }
  if (isRejected) {
    return Maybe.just('request-failed');
  }
  return Maybe.nothing();
};
