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

import type {Clock} from '@enormora/clock/clock';
import {isUndefined} from '@sindresorhus/is';

import {
  runBulkRestore,
  type BulkRestoreDependencies,
  type BulkRestoreOutcome,
  type BulkRestoreTarget,
} from './runBulkRestore';

import type {QualifiedId} from '../../../../../apiClient/user/qualifiedId';
import type {CellsRepository} from '../../../../../repositories/cells/cellsRepository';
import {createBulkJobPollingPolicy} from '../../common/cellsBackgroundActionPolling/createBulkJobPollingPolicy';
import {getCellsApiPath} from '../../common/getCellsApiPath/getCellsApiPath';
import {RECYCLE_BIN_PATH} from '../../common/recycleBin/recycleBin';
import type {BackgroundActionObservation} from '../../sharedDriveBackgroundActionController';
import type {SharedDriveMoveStatus, SharedDriveMoveStatusKind} from '../../sharedDriveUploadStatusContext';

const REVIEW_REFRESH_DEADLINE_MS = 20_000;

export type BulkRestoreReviewReason = Exclude<BulkRestoreOutcome, 'completed'> | 'refresh-failed';

export interface BulkRestoreOptions {
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
  readonly observeBackgroundAction: (observation: BackgroundActionObservation) => void;
  readonly setBackgroundActionJobUuids?: (id: string, jobUuids: readonly string[]) => void;
  readonly publishStatus: (status: SharedDriveMoveStatus) => void;
}

export interface BulkRestoreSnapshot {
  readonly isPending: boolean;
  readonly isRefreshingReview: boolean;
  readonly reviewReason: BulkRestoreReviewReason | null;
}

export interface BulkRestoreController {
  readonly getSnapshot: () => BulkRestoreSnapshot;
  readonly subscribe: (listener: () => void) => () => void;
  readonly setOptions: (options: BulkRestoreOptions) => void;
  readonly mount: () => void;
  readonly dispose: () => void;
  readonly restore: (
    targets: readonly BulkRestoreTarget[],
    scopeKey: string,
    status: SharedDriveMoveStatus,
  ) => Promise<void>;
  readonly refreshReview: () => Promise<void>;
  readonly resumeReview: (reason: BulkRestoreReviewReason) => void;
  readonly reset: () => void;
}

/** Owns restore state and async work independently of React's render lifecycle. */
export const createBulkRestoreController = (initialOptions: BulkRestoreOptions): BulkRestoreController => {
  let options = initialOptions;
  let mounted = true;
  let generation = 0;
  let snapshot: BulkRestoreSnapshot = {isPending: false, isRefreshingReview: false, reviewReason: null};
  const listeners = new Set<() => void>();

  const updateSnapshot = (change: Partial<BulkRestoreSnapshot>): void => {
    if (!mounted) {
      return;
    }
    const next = {...snapshot, ...change};
    if (
      next.isPending === snapshot.isPending &&
      next.isRefreshingReview === snapshot.isRefreshingReview &&
      next.reviewReason === snapshot.reviewReason
    ) {
      return;
    }
    snapshot = next;
    listeners.forEach(listener => {
      listener();
    });
  };

  const refreshAndReportSuccess = async (): Promise<boolean> => {
    try {
      return await options.onRefreshAndReportSuccess();
    } catch (error) {
      options.reportError(error);
      return false;
    }
  };

  const lookupRootParentId = async (rootParentName: string): Promise<string> => {
    const {cellsRepository, conversationQualifiedId} = options;
    const rootParent = await cellsRepository.lookupNodeByPath({
      path: getCellsApiPath({conversationQualifiedId, currentPath: `${RECYCLE_BIN_PATH}/${rootParentName}`}),
    });
    if (isUndefined(rootParent)) {
      throw new Error('Root parent node not found');
    }
    return rootParent.Uuid;
  };

  const restore = async (
    targets: readonly BulkRestoreTarget[],
    scopeKey: string,
    status: SharedDriveMoveStatus,
  ): Promise<void> => {
    if (!mounted || snapshot.isPending || snapshot.reviewReason !== null || !options.isCurrentScope(scopeKey)) {
      return;
    }

    const requestGeneration = ++generation;
    updateSnapshot({isPending: true});
    options.onStatusChange('processing');
    const observeJobs: BulkRestoreDependencies['observeJobs'] = jobUuids => {
      return new Promise(resolve => {
        const {cellsRepository, clock, random, observeBackgroundAction} = options;
        options.setBackgroundActionJobUuids?.(status.id, jobUuids);
        observeBackgroundAction({
          actionName: 'restore',
          cellsRepository,
          status,
          jobUuids,
          clock,
          pollingPolicy: createBulkJobPollingPolicy(random),
          onOutcome: resolve,
        });
      });
    };

    try {
      const outcome = await runBulkRestore({
        targets,
        lookupRootParentId,
        restoreNodes: params => {
          return options.cellsRepository.restoreNodes(params);
        },
        observeJobs,
        reportError: error => {
          options.reportError(error);
        },
      });
      if (!mounted || generation !== requestGeneration || !options.isCurrentScope(scopeKey)) {
        const {onReview: _onReview, isReviewing: _isReviewing, ...detachedStatus} = status;
        options.publishStatus({...detachedStatus, kind: outcome});
        return;
      }

      const didRefresh = await refreshAndReportSuccess();
      const statusKind = outcome === 'completed' && !didRefresh ? 'finished-unknown' : outcome;
      if (!mounted || generation !== requestGeneration) {
        const {onReview: _onReview, isReviewing: _isReviewing, ...detachedStatus} = status;
        options.publishStatus({...detachedStatus, kind: statusKind});
        return;
      }
      if (!options.isCurrentScope(scopeKey)) {
        const {onReview: _onReview, isReviewing: _isReviewing, ...detachedStatus} = status;
        options.publishStatus({...detachedStatus, kind: statusKind});
        return;
      }

      options.onStatusChange(statusKind);
      if (statusKind === 'completed') {
        options.onRestoreSettled();
      } else {
        updateSnapshot({reviewReason: outcome === 'completed' ? 'refresh-failed' : outcome});
      }
    } finally {
      if (mounted && generation === requestGeneration) {
        updateSnapshot({isPending: false});
      }
    }
  };

  const refreshReview = async (): Promise<void> => {
    if (!mounted || snapshot.reviewReason === null || snapshot.isPending || snapshot.isRefreshingReview) {
      return;
    }

    const reviewGeneration = ++generation;
    updateSnapshot({isRefreshingReview: true});
    const {clock} = options;
    let deadline: ReturnType<typeof clock.setTimeout> | undefined;
    const deadlineReached = new Promise<'timed-out'>(resolve => {
      deadline = clock.setTimeout(() => {
        resolve('timed-out');
      }, REVIEW_REFRESH_DEADLINE_MS);
    });
    try {
      const didRefresh = await Promise.race([refreshAndReportSuccess(), deadlineReached]);
      if (!mounted || generation !== reviewGeneration || didRefresh === 'timed-out') {
        return;
      }
      if (didRefresh) {
        updateSnapshot({reviewReason: null});
        options.onStatusCleared();
        options.onRestoreSettled();
      }
    } finally {
      if (deadline !== undefined) {
        clock.clearTimeout(deadline);
      }
      if (mounted && generation === reviewGeneration) {
        updateSnapshot({isRefreshingReview: false});
      }
    }
  };

  const reset = (): void => {
    generation += 1;
    updateSnapshot({isPending: false, isRefreshingReview: false, reviewReason: null});
  };

  return {
    getSnapshot: () => {
      return snapshot;
    },
    subscribe: listener => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setOptions: nextOptions => {
      options = nextOptions;
    },
    mount: () => {
      mounted = true;
    },
    dispose: () => {
      mounted = false;
      generation += 1;
    },
    restore,
    refreshReview,
    resumeReview: reason => {
      updateSnapshot({reviewReason: reason});
    },
    reset,
  };
};
