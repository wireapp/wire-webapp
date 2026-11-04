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

import {useCallback, useEffect, useRef, useState} from 'react';

import type {Clock} from '@enormora/clock/clock';
import {isUndefined} from '@sindresorhus/is';
import type {QualifiedId} from '@wireapp/api-client/lib/user';

import {observeCellsBackgroundActionJobs} from 'Components/conversation/conversationCells/common/cellsBackgroundActionPolling/cellsBackgroundActionJobs';
import {createBulkJobPollingPolicy} from 'Components/conversation/conversationCells/common/cellsBackgroundActionPolling/createBulkJobPollingPolicy';
import {getCellsApiPath} from 'Components/conversation/conversationCells/common/getCellsApiPath/getCellsApiPath';
import {RECYCLE_BIN_PATH} from 'Components/conversation/conversationCells/common/recycleBin/recycleBin';
import type {CellsRepository} from 'Repositories/cells/cellsRepository';

import type {RestoreTarget} from './resolveRestoreTargets';
import {runBulkRestore, type BulkRestoreDependencies, type BulkRestoreOutcome} from './runBulkRestore';

import type {SharedDriveMoveStatusKind} from '../../sharedDriveUploadStatusContext';

const REVIEW_REFRESH_DEADLINE_MS = 20_000;

export type BulkRestoreReviewReason = Exclude<BulkRestoreOutcome, 'completed'> | 'refresh-failed';

export interface UseBulkRestoreOptions {
  readonly cellsRepository: Pick<CellsRepository, 'lookupNodeByPath' | 'restoreNodes' | 'getBackgroundActionInfo'>;
  readonly clock: Clock;
  readonly random: () => number;
  readonly conversationQualifiedId: QualifiedId;
  readonly isCurrentScope: (scopeKey: string) => boolean;
  readonly onRefreshAndReportSuccess: () => Promise<boolean>;
  readonly onRestoreSettled: () => void;
  readonly onStatusChange: (kind: SharedDriveMoveStatusKind) => void;
  readonly onStatusCleared: () => void;
  readonly reportError: (error: unknown) => void;
}

export interface BulkRestoreState {
  readonly isPending: boolean;
  readonly isRefreshingReview: boolean;
  readonly reviewReason: BulkRestoreReviewReason | null;
  readonly restore: (targets: readonly RestoreTarget[], scopeKey: string) => Promise<void>;
  readonly refreshReview: () => Promise<void>;
  readonly reset: () => void;
}

export const useBulkRestore = (options: UseBulkRestoreOptions): BulkRestoreState => {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [isPending, setIsPending] = useState(false);
  const [isRefreshingReview, setIsRefreshingReview] = useState(false);
  const [reviewReason, setReviewReason] = useState<BulkRestoreReviewReason | null>(null);

  const isMountedRef = useRef(true);
  const isPendingRef = useRef(false);
  const reviewReasonRef = useRef<BulkRestoreReviewReason | null>(null);
  const cancelJobObservationRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancelJobObservationRef.current?.();
    };
  }, []);

  const updateReviewReason = (reason: BulkRestoreReviewReason | null): void => {
    reviewReasonRef.current = reason;
    setReviewReason(reason);
  };

  const refreshAndReportSuccess = async (): Promise<boolean> => {
    try {
      return await optionsRef.current.onRefreshAndReportSuccess();
    } catch (error) {
      optionsRef.current.reportError(error);
      return false;
    }
  };

  const lookupRootParentId = async (rootParentName: string): Promise<string> => {
    const {cellsRepository, conversationQualifiedId} = optionsRef.current;
    const rootParent = await cellsRepository.lookupNodeByPath({
      path: getCellsApiPath({conversationQualifiedId, currentPath: `${RECYCLE_BIN_PATH}/${rootParentName}`}),
    });
    if (isUndefined(rootParent)) {
      throw new Error('Root parent node not found');
    }
    return rootParent.Uuid;
  };

  const observeJobs: BulkRestoreDependencies['observeJobs'] = jobUuids => {
    return new Promise(resolve => {
      const {cellsRepository, clock, random} = optionsRef.current;
      cancelJobObservationRef.current = observeCellsBackgroundActionJobs({
        actionName: 'restore',
        cellsRepository,
        jobUuids,
        clock,
        pollingPolicy: createBulkJobPollingPolicy(random),
        isCurrent: () => {
          return isMountedRef.current;
        },
        onOutcome: resolve,
      });
    });
  };

  const restore = async (targets: readonly RestoreTarget[], scopeKey: string): Promise<void> => {
    if (isPendingRef.current || reviewReasonRef.current !== null || !optionsRef.current.isCurrentScope(scopeKey)) {
      return;
    }

    isPendingRef.current = true;
    setIsPending(true);
    optionsRef.current.onStatusChange('processing');
    try {
      const outcome = await runBulkRestore({
        targets,
        lookupRootParentId,
        restoreNodes: params => {
          return optionsRef.current.cellsRepository.restoreNodes(params);
        },
        observeJobs,
        reportError: error => {
          optionsRef.current.reportError(error);
        },
      });
      if (!isMountedRef.current || !optionsRef.current.isCurrentScope(scopeKey)) {
        // The view moved on: skip refreshing it, but do not leave the status popup stuck on processing.
        optionsRef.current.onStatusChange(outcome);
        return;
      }

      const didRefresh = await refreshAndReportSuccess();
      const statusKind = outcome === 'completed' && !didRefresh ? 'finished-unknown' : outcome;
      if (!isMountedRef.current || !optionsRef.current.isCurrentScope(scopeKey)) {
        // Refreshing can itself move the view (e.g. to the Bin root); still report so the popup is not left processing.
        optionsRef.current.onStatusChange(statusKind);
        return;
      }

      if (statusKind === 'completed') {
        optionsRef.current.onStatusChange('completed');
        optionsRef.current.onRestoreSettled();
      } else {
        optionsRef.current.onStatusChange(statusKind);
        updateReviewReason(outcome === 'completed' ? 'refresh-failed' : outcome);
      }
    } finally {
      isPendingRef.current = false;
      if (isMountedRef.current) {
        setIsPending(false);
      }
    }
  };

  const refreshReview = async (): Promise<void> => {
    if (reviewReasonRef.current === null || isPendingRef.current) {
      return;
    }

    setIsRefreshingReview(true);
    const {clock} = optionsRef.current;
    let deadline: ReturnType<typeof clock.setTimeout> | undefined;
    const deadlineReached = new Promise<'timed-out'>(resolve => {
      deadline = clock.setTimeout(() => {
        resolve('timed-out');
      }, REVIEW_REFRESH_DEADLINE_MS);
    });
    try {
      const didRefresh = await Promise.race([refreshAndReportSuccess(), deadlineReached]);
      if (deadline !== undefined) {
        clock.clearTimeout(deadline);
      }
      // A refresh that outlives its deadline is abandoned so the review action can be retried.
      if (!isMountedRef.current || didRefresh === 'timed-out') {
        return;
      }

      if (didRefresh) {
        updateReviewReason(null);
        optionsRef.current.onStatusCleared();
        optionsRef.current.onRestoreSettled();
      }
    } finally {
      if (isMountedRef.current) {
        setIsRefreshingReview(false);
      }
    }
  };

  const reset = useCallback((): void => {
    cancelJobObservationRef.current?.();
    cancelJobObservationRef.current = undefined;
    isPendingRef.current = false;
    reviewReasonRef.current = null;
    setIsPending(false);
    setIsRefreshingReview(false);
    setReviewReason(null);
  }, []);

  return {isPending, isRefreshingReview, reviewReason, restore, refreshReview, reset};
};
