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

import type {Translate} from 'Util/localizerUtil';

import {moveStatusMessageKey} from './sharedDriveMoveStatusMessages';
import type {
  SharedDriveBulkAction,
  SharedDriveMoveStatus,
  SharedDriveMoveStatusKind,
} from './sharedDriveUploadStatusContext';

type TranslationKey = Parameters<Translate>[0];
type ReviewKind = Exclude<SharedDriveMoveStatusKind, 'processing' | 'completed'>;

interface BulkActionStatusCopy {
  readonly titleKey: Record<SharedDriveMoveStatusKind, TranslationKey>;
  readonly labelKey: Record<SharedDriveMoveStatusKind, TranslationKey>;
  readonly messageKey: Record<ReviewKind, TranslationKey>;
  readonly getDestination: (translate: Translate, status: SharedDriveMoveStatus) => string;
}

const reviewKinds: readonly ReviewKind[] = [
  'request-failed',
  'partial',
  'finished-unknown',
  'failed',
  'status-unknown',
];

const forEveryReviewKind = <Value>(value: Value): Record<ReviewKind, Value> => {
  return Object.fromEntries(
    reviewKinds.map(kind => {
      return [kind, value];
    }),
  ) as Record<ReviewKind, Value>;
};

const forEveryKind = (
  processing: TranslationKey,
  completed: TranslationKey,
  review: TranslationKey,
): Record<SharedDriveMoveStatusKind, TranslationKey> => {
  return {processing, completed, ...forEveryReviewKind(review)};
};

const moveCopy: BulkActionStatusCopy = {
  titleKey: {
    processing: 'cells.bulkMove.movingItems',
    completed: 'cells.bulkMove.movedItems',
    'request-failed': 'cells.bulkMove.requestFailedTitle',
    partial: 'cells.bulkMove.partialMoveWarningTitle',
    'finished-unknown': 'cells.bulkMove.finishedUnknownTitle',
    failed: 'cells.bulkMove.allJobsFailedTitle',
    'status-unknown': 'cells.bulkMove.statusLookupUnknownTitle',
  },
  labelKey: forEveryKind('cells.bulkMove.processing', 'cells.bulkMove.completed', 'cells.bulkMove.needsReviewStatus'),
  messageKey: moveStatusMessageKey,
  getDestination: (translate, status) => {
    return translate('cells.uploadStatus.destination', {destination: status.destinationPath});
  },
};

const restoreCopy: BulkActionStatusCopy = {
  titleKey: forEveryKind(
    'cells.bulkRestore.status.restoring',
    'cells.bulkRestore.status.restored',
    'cells.bulkRestore.status.needsReview',
  ),
  labelKey: forEveryKind(
    'cells.bulkMove.processing',
    'cells.bulkRestore.status.completed',
    'cells.bulkMove.needsReviewStatus',
  ),
  messageKey: forEveryReviewKind('cells.restore.error'),
  getDestination: translate => {
    return translate('cells.uploadStatus.destination', {
      destination: translate('cells.bulkRestore.status.destination'),
    });
  },
};

const permanentDeleteCopy: BulkActionStatusCopy = {
  titleKey: forEveryKind(
    'cells.bulkDelete.status.deleting',
    'cells.bulkDelete.status.deleted',
    'cells.bulkDelete.status.needsReview',
  ),
  labelKey: forEveryKind(
    'cells.bulkMove.processing',
    'cells.bulkDelete.status.completed',
    'cells.bulkMove.needsReviewStatus',
  ),
  messageKey: {
    'request-failed': 'cells.bulkDelete.rejected',
    failed: 'cells.bulkDelete.jobFailed',
    'finished-unknown': 'cells.bulkDelete.refreshFailed',
    'status-unknown': 'cells.bulkDelete.timedOut',
    partial: 'cells.bulkDelete.stillVisible',
  },
  getDestination: () => {
    return '';
  },
};

const emptyBinCopy: BulkActionStatusCopy = {
  titleKey: forEveryKind(
    'cells.emptyBin.status.processing',
    'cells.emptyBin.status.completed',
    'cells.emptyBin.status.needsReview',
  ),
  labelKey: forEveryKind(
    'cells.bulkMove.processing',
    'cells.emptyBin.status.completed',
    'cells.bulkMove.needsReviewStatus',
  ),
  messageKey: {
    'request-failed': 'cells.emptyBin.status.lookup-error',
    partial: 'cells.emptyBin.status.partial',
    failed: 'cells.emptyBin.status.failed',
    'status-unknown': 'cells.emptyBin.status.unknown',
    'finished-unknown': 'cells.emptyBin.refreshFailed',
  },
  getDestination: () => {
    return '';
  },
};

const copyByAction: Record<SharedDriveBulkAction, BulkActionStatusCopy> = {
  move: moveCopy,
  restore: restoreCopy,
  permanentDelete: permanentDeleteCopy,
  emptyBin: emptyBinCopy,
};

export const getBulkActionStatusCopy = (action: SharedDriveBulkAction): BulkActionStatusCopy => {
  return copyByAction[action];
};
