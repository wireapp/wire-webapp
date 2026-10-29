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

import type {SharedDriveMoveStatusKind} from '../sharedDriveUploadStatusContext';

export type BulkMoveReviewReason = Exclude<SharedDriveMoveStatusKind, 'processing' | 'completed'>;

export type BulkMoveState =
  | {readonly kind: 'idle' | 'request-pending' | 'background-pending'}
  | {
      readonly kind: 'needs-review';
      readonly reason: BulkMoveReviewReason;
      readonly refresh: 'idle' | 'refreshing' | 'failed';
    };

type BulkMoveEvent =
  | {readonly type: 'request-started' | 'background-started' | 'resolved' | 'refresh-started' | 'refresh-failed'}
  | {readonly type: 'needs-review'; readonly reason: BulkMoveReviewReason};

export const bulkMoveReducer = (state: BulkMoveState, event: BulkMoveEvent): BulkMoveState => {
  switch (event.type) {
    case 'request-started':
      return {kind: 'request-pending'};
    case 'background-started':
      return {kind: 'background-pending'};
    case 'resolved':
      return {kind: 'idle'};
    case 'needs-review':
      return {kind: 'needs-review', reason: event.reason, refresh: 'idle'};
    case 'refresh-started':
      return state.kind === 'needs-review' ? {...state, refresh: 'refreshing'} : state;
    case 'refresh-failed':
      return state.kind === 'needs-review' ? {...state, refresh: 'failed'} : state;
  }
};
