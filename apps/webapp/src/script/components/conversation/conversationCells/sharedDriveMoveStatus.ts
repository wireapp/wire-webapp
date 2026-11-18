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

export interface SharedDriveMoveItem {
  readonly id: string;
  readonly name: string;
  readonly isFolder: boolean;
}

export type SharedDriveBulkAction = 'move' | 'restore' | 'permanentDelete' | 'emptyBin';

export interface SharedDriveMoveSummary {
  readonly action: SharedDriveBulkAction;
  readonly items: readonly SharedDriveMoveItem[];
  readonly destinationPath: string;
}

export type SharedDriveMoveStatusKind =
  'processing' | 'completed' | 'request-failed' | 'partial' | 'finished-unknown' | 'failed' | 'status-unknown';

export interface SharedDriveMoveStatus extends SharedDriveMoveSummary {
  readonly id: string;
  readonly conversationQualifiedId: string;
  readonly kind: SharedDriveMoveStatusKind;
  /** Retries the check for an outcome that needs review; the popup offers it as a button when set. */
  readonly onReview?: () => void;
  /** True while the review is running; the popup disables its review button meanwhile. */
  readonly isReviewing?: boolean;
}
