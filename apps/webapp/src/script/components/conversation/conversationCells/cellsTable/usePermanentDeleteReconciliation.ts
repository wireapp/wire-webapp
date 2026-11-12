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
import {maybe} from 'true-myth';

import {StatusCode} from '../../../../apiClient/http';
import {BackendError} from '../../../../apiClient/http/backendError';
import type {CellsRepository} from '../../../../repositories/cells/cellsRepository';
import {
  checkCellsBackgroundActionJobs,
  getCellsBackgroundActionEvidence,
} from '../common/cellsBackgroundActionPolling/cellsBackgroundActionJobs';

const PERMANENT_DELETE_RECONCILIATION_INTERVAL_MS = 1000;
const PERMANENT_DELETE_RECONCILIATION_TIMEOUT_MS = 20_000;

export type PermanentDeleteReviewReason = 'job-failed' | 'refresh-failed' | 'still-visible' | 'timed-out';

interface PermanentDeleteReconciliationContext {
  readonly nodeIds: readonly string[];
  readonly scopeKey: string;
  readonly path: string;
  readonly jobUuids: readonly string[];
  readonly hasKnownJobFailure: boolean;
}

interface ScheduledTimeout {
  readonly generation: number;
  readonly clock: Clock;
  readonly timeout: ReturnType<Clock['setTimeout']>;
}

export interface UsePermanentDeleteReconciliationOptions {
  readonly cellsRepository: Pick<CellsRepository, 'deleteNodes' | 'getBackgroundActionInfo'>;
  readonly clock: Clock;
  readonly isCurrentScope: (scopeKey: string, path: string) => boolean;
  readonly visibleNodeIds: readonly string[];
  readonly isNodesLoading: boolean;
  readonly onRefresh: () => void;
  readonly onRefreshAndReportSuccess: () => Promise<boolean>;
  readonly onDeleteCompleted: (nodeIds: readonly string[]) => void;
  readonly onReconciliationCompleted: () => void;
  readonly reportError: (error: unknown) => void;
}

export interface PermanentDeleteReconciliationState {
  readonly isPending: boolean;
  readonly isRejected: boolean;
  readonly isUnresolved: boolean;
  readonly isRefreshingReview: boolean;
  readonly isReconciling: boolean;
  readonly isRequestInFlight: boolean;
  readonly isWaitingForReconciliation: boolean;
  readonly reviewReason: PermanentDeleteReviewReason | null;
  readonly deletePermanently: (nodeIds: readonly string[], scopeKey: string, path: string) => Promise<void>;
  readonly refreshReview: () => Promise<void>;
  readonly cancel: () => void;
  readonly clearRejection: () => void;
  readonly reset: () => void;
}

const isAuthoritativeRejection = (error: unknown): boolean => {
  return (
    error instanceof BackendError &&
    error.code !== undefined &&
    error.code >= StatusCode.BAD_REQUEST &&
    error.code < StatusCode.INTERNAL_SERVER_ERROR &&
    error.code !== StatusCode.REQUEST_TIMEOUT
  );
};

const isFailureReason = (reason: PermanentDeleteReviewReason | null): reason is 'job-failed' | 'refresh-failed' => {
  return reason === 'job-failed' || reason === 'refresh-failed';
};

export const usePermanentDeleteReconciliation = (
  options: UsePermanentDeleteReconciliationOptions,
): PermanentDeleteReconciliationState => {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [isPending, setIsPending] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [isUnresolved, setIsUnresolved] = useState(false);
  const [isRefreshingReview, setIsRefreshingReview] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isRequestInFlight, setIsRequestInFlight] = useState(false);
  const [isWaitingForReconciliation, setIsWaitingForReconciliation] = useState(false);
  const [reviewReason, setReviewReasonState] = useState<PermanentDeleteReviewReason | null>(null);

  const isMountedRef = useRef(true);
  const generationRef = useRef(0);
  const requestIdRef = useRef(0);
  const isPendingRef = useRef(false);
  const isUnresolvedRef = useRef(false);
  const isReconcilingRef = useRef(false);
  const isRequestInFlightRef = useRef(false);
  const activeContextRef = useRef<PermanentDeleteReconciliationContext | null>(null);
  const cancelJobCheckRef = useRef<(() => void) | undefined>(undefined);
  const retryTimeoutRef = useRef<ScheduledTimeout | undefined>(undefined);
  const deadlineRef = useRef<ScheduledTimeout | undefined>(undefined);
  const reviewReasonRef = useRef<PermanentDeleteReviewReason | null>(null);

  const updateReviewReason = (reason: PermanentDeleteReviewReason | null): void => {
    reviewReasonRef.current = reason;
    if (isMountedRef.current) {
      setReviewReasonState(reason);
    }
  };

  const clearTimeoutRef = (timeoutRef: {current: ScheduledTimeout | undefined}, generation?: number): void => {
    const scheduled = timeoutRef.current;
    if (scheduled === undefined || (generation !== undefined && scheduled.generation !== generation)) {
      return;
    }

    scheduled.clock.clearTimeout(scheduled.timeout);
    timeoutRef.current = undefined;
  };

  const clearDeadline = (generation?: number): void => {
    clearTimeoutRef(deadlineRef, generation);
  };

  const isCurrent = (context: PermanentDeleteReconciliationContext, generation: number): boolean => {
    return (
      isMountedRef.current &&
      generationRef.current === generation &&
      optionsRef.current.isCurrentScope(context.scopeKey, context.path)
    );
  };

  const invalidateWork = (expectedGeneration?: number): number | undefined => {
    if (expectedGeneration !== undefined && generationRef.current !== expectedGeneration) {
      return undefined;
    }

    const previousGeneration = generationRef.current;
    generationRef.current += 1;
    cancelJobCheckRef.current?.();
    cancelJobCheckRef.current = undefined;
    clearTimeoutRef(retryTimeoutRef, previousGeneration);
    clearDeadline(previousGeneration);
    requestIdRef.current += 1;
    isRequestInFlightRef.current = false;
    isReconcilingRef.current = false;
    if (isMountedRef.current) {
      setIsRequestInFlight(false);
      setIsRefreshingReview(false);
      setIsReconciling(false);
    }
    return generationRef.current;
  };
  const invalidateWorkRef = useRef(invalidateWork);
  invalidateWorkRef.current = invalidateWork;

  const startDeadline = (context: PermanentDeleteReconciliationContext, generation: number): void => {
    clearDeadline();
    const clock = optionsRef.current.clock;
    const timeout = clock.setTimeout(() => {
      const scheduled = deadlineRef.current;
      if (scheduled === undefined || scheduled.generation !== generation) {
        return;
      }
      deadlineRef.current = undefined;

      if (!isCurrent(context, generation)) {
        invalidateWork(generation);
        return;
      }

      const previousReason = reviewReasonRef.current;
      invalidateWork(generation);
      if (isMountedRef.current) {
        setIsWaitingForReconciliation(false);
      }
      updateReviewReason(isFailureReason(previousReason) ? previousReason : 'timed-out');
    }, PERMANENT_DELETE_RECONCILIATION_TIMEOUT_MS);
    deadlineRef.current = {generation, clock, timeout};
  };

  const startReconciliation = (context: PermanentDeleteReconciliationContext): void => {
    const generation = invalidateWork();
    if (generation === undefined) {
      return;
    }

    activeContextRef.current = context;
    isUnresolvedRef.current = true;
    isReconcilingRef.current = true;
    setIsUnresolved(true);
    setIsRejected(false);
    setIsReconciling(true);
    setIsWaitingForReconciliation(false);
    updateReviewReason(null);
    startDeadline(context, generation);
    void runReconciliation(context, generation);
  };

  const runReconciliation = async (
    context: PermanentDeleteReconciliationContext,
    generation: number,
  ): Promise<void> => {
    if (!isCurrent(context, generation) || isRequestInFlightRef.current) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    isRequestInFlightRef.current = true;
    setIsRequestInFlight(true);

    try {
      const check = checkCellsBackgroundActionJobs({
        actionName: 'delete',
        cellsRepository: optionsRef.current.cellsRepository,
        jobUuids: context.jobUuids,
        clock: optionsRef.current.clock,
        isCurrent: () => {
          return isCurrent(context, generation);
        },
      });
      cancelJobCheckRef.current = check.cancel;
      const jobEvidence = await check.result;
      if (!isCurrent(context, generation) || maybe.isNothing(jobEvidence)) {
        return;
      }
      cancelJobCheckRef.current = undefined;

      const hasJobFailure = context.hasKnownJobFailure || jobEvidence.value.hasFailedJobs;
      const nextContext = {
        ...context,
        jobUuids: jobEvidence.value.hasPendingJobs ? context.jobUuids : [],
        hasKnownJobFailure: hasJobFailure,
      };

      setIsWaitingForReconciliation(false);
      let wasRefreshSuccessful = false;
      try {
        wasRefreshSuccessful = await optionsRef.current.onRefreshAndReportSuccess();
      } catch (error) {
        optionsRef.current.reportError(error);
      }
      if (!isCurrent(context, generation)) {
        return;
      }

      setIsWaitingForReconciliation(wasRefreshSuccessful);
      if (!wasRefreshSuccessful) {
        updateReviewReason('refresh-failed');
      } else if (hasJobFailure) {
        updateReviewReason('job-failed');
      } else {
        updateReviewReason(null);
      }

      retryTimeoutRef.current = {
        generation,
        clock: optionsRef.current.clock,
        timeout: optionsRef.current.clock.setTimeout(() => {
          retryTimeoutRef.current = undefined;
          void runReconciliation(nextContext, generation);
        }, PERMANENT_DELETE_RECONCILIATION_INTERVAL_MS),
      };
    } finally {
      if (requestIdRef.current === requestId && generationRef.current === generation) {
        isRequestInFlightRef.current = false;
        if (isMountedRef.current) {
          setIsRequestInFlight(false);
        }
      }
    }
  };

  const deletePermanently = async (nodeIds: readonly string[], scopeKey: string, path: string): Promise<void> => {
    if (
      !isMountedRef.current ||
      isPendingRef.current ||
      isUnresolvedRef.current ||
      !optionsRef.current.isCurrentScope(scopeKey, path)
    ) {
      return;
    }

    const requestGeneration = generationRef.current;
    isPendingRef.current = true;
    setIsPending(true);
    setIsRejected(false);
    const context: PermanentDeleteReconciliationContext = {
      nodeIds,
      scopeKey,
      path,
      jobUuids: [],
      hasKnownJobFailure: false,
    };

    try {
      const response = await optionsRef.current.cellsRepository.deleteNodes({uuids: [...nodeIds], permanently: true});
      if (!isCurrent(context, requestGeneration)) {
        return;
      }

      const evidence = getCellsBackgroundActionEvidence(response, 'delete');
      if (!evidence.hasCompleted) {
        startReconciliation({...context, jobUuids: evidence.jobUuids, hasKnownJobFailure: evidence.hasFailedJobs});
        return;
      }

      setIsRejected(false);
      optionsRef.current.onDeleteCompleted(nodeIds);
      if (isCurrent(context, requestGeneration)) {
        optionsRef.current.onRefresh();
      }
    } catch (error) {
      if (!isMountedRef.current || generationRef.current !== requestGeneration) {
        return;
      }
      optionsRef.current.reportError(error);
      if (!isCurrent(context, requestGeneration)) {
        return;
      }
      if (isAuthoritativeRejection(error)) {
        setIsRejected(true);
        return;
      }

      startReconciliation(context);
    } finally {
      isPendingRef.current = false;
      if (isMountedRef.current) {
        setIsPending(false);
      }
    }
  };

  const refreshReview = async (): Promise<void> => {
    const context = activeContextRef.current;
    if (
      context === null ||
      !isUnresolvedRef.current ||
      isReconcilingRef.current ||
      isPendingRef.current ||
      isRequestInFlightRef.current
    ) {
      return;
    }

    const generation = invalidateWork();
    if (generation === undefined) {
      return;
    }
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    isRequestInFlightRef.current = true;
    setIsRequestInFlight(true);
    setIsRefreshingReview(true);
    setIsWaitingForReconciliation(false);
    startDeadline(context, generation);

    let wasRefreshSuccessful = false;
    try {
      try {
        wasRefreshSuccessful = await optionsRef.current.onRefreshAndReportSuccess();
      } catch (error) {
        optionsRef.current.reportError(error);
      }
      if (!isCurrent(context, generation)) {
        return;
      }

      clearDeadline(generation);
      if (!wasRefreshSuccessful) {
        updateReviewReason(reviewReasonRef.current === 'job-failed' ? 'job-failed' : 'refresh-failed');
        return;
      }

      updateReviewReason(reviewReasonRef.current === 'job-failed' ? 'job-failed' : 'still-visible');
      setIsWaitingForReconciliation(true);
    } finally {
      if (requestIdRef.current === requestId && generationRef.current === generation) {
        isRequestInFlightRef.current = false;
        if (isMountedRef.current) {
          setIsRequestInFlight(false);
          setIsRefreshingReview(false);
        }
      }
    }
  };

  const cancel = (): void => {
    invalidateWork();
  };

  const clearRejection = (): void => {
    setIsRejected(false);
  };

  const reset = (): void => {
    invalidateWork();
    activeContextRef.current = null;
    isUnresolvedRef.current = false;
    if (isMountedRef.current) {
      setIsRejected(false);
      setIsUnresolved(false);
      setIsWaitingForReconciliation(false);
    }
    updateReviewReason(null);
  };

  const actionsRef = useRef({deletePermanently, refreshReview, cancel, clearRejection, reset});
  actionsRef.current = {deletePermanently, refreshReview, cancel, clearRejection, reset};
  const stableDeletePermanently = useCallback((nodeIds: readonly string[], scopeKey: string, path: string) => {
    return actionsRef.current.deletePermanently(nodeIds, scopeKey, path);
  }, []);
  const stableRefreshReview = useCallback(() => {
    return actionsRef.current.refreshReview();
  }, []);
  const stableCancel = useCallback(() => {
    actionsRef.current.cancel();
  }, []);
  const stableClearRejection = useCallback(() => {
    actionsRef.current.clearRejection();
  }, []);
  const stableReset = useCallback(() => {
    actionsRef.current.reset();
  }, []);

  useEffect(() => {
    if (!isWaitingForReconciliation || options.isNodesLoading) {
      return;
    }

    const context = activeContextRef.current;
    const visibleNodeIds = new Set(options.visibleNodeIds);
    if (
      context === null ||
      context.nodeIds.some(nodeId => {
        return visibleNodeIds.has(nodeId);
      })
    ) {
      return;
    }

    invalidateWorkRef.current();
    activeContextRef.current = null;
    isUnresolvedRef.current = false;
    setIsRejected(false);
    setIsUnresolved(false);
    setIsWaitingForReconciliation(false);
    updateReviewReason(null);
    optionsRef.current.onReconciliationCompleted();
  }, [isWaitingForReconciliation, options.isNodesLoading, options.visibleNodeIds]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      invalidateWorkRef.current();
    };
  }, []);

  return {
    isPending,
    isRejected,
    isUnresolved,
    isRefreshingReview,
    isReconciling,
    isRequestInFlight,
    isWaitingForReconciliation,
    reviewReason,
    deletePermanently: stableDeletePermanently,
    refreshReview: stableRefreshReview,
    cancel: stableCancel,
    clearRejection: stableClearRejection,
    reset: stableReset,
  };
};
