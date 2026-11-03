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
import {BackendError, StatusCode} from '@wireapp/api-client/lib/http/';
import type {QualifiedId} from '@wireapp/api-client/lib/user/';
import {JobsTaskStatus, TreeNodeType} from 'cells-sdk-ts';
import {noop} from 'noop-esm';
import {Maybe, maybe} from 'true-myth';

import type {CellsRepository} from 'Repositories/cells/cellsRepository';

import {getRecycleBinNodePath} from '../../cellsHeader/cellsEmptyBinAction/emptyBinAction';
import type {SharedDriveMoveSummary} from '../../sharedDriveUploadStatusContext';
import {
  checkCellsBackgroundActionJobs,
  getCellsBackgroundActionEvidence,
  observeCellsBackgroundActionJobs,
} from '../cellsBackgroundActionPolling/cellsBackgroundActionJobs';
import type {CellsBackgroundActionOutcome} from '../cellsBackgroundActionPolling/cellsBackgroundActionPolling';

const POLL_INTERVAL_MS = 1000;
const RETRY_BACKOFF_BASE = 2;
const RECONCILIATION_TIMEOUT_MS = 20_000;

export type BinOperationKind = 'move-to-bin' | 'permanent-delete' | 'empty-bin';
export type BinOperationState = 'submitting' | 'processing' | 'needs-review' | 'completed' | 'rejected';
export type BinOperationReason = 'request-failed' | 'partial' | 'job-failed' | 'status-unknown' | 'timed-out';

export interface BinOperation {
  readonly id: number;
  readonly kind: BinOperationKind;
  readonly drive: QualifiedId;
  readonly path: string;
  readonly targetIds: readonly string[];
  readonly jobUuids: readonly string[];
  readonly state: BinOperationState;
  readonly reason: BinOperationReason | undefined;
  readonly needsRefresh: boolean;
  readonly isLocked: boolean;
  readonly summary?: SharedDriveMoveSummary;
}

interface StartBinOperationInput {
  readonly kind: BinOperationKind;
  readonly drive: QualifiedId;
  readonly path: string;
  readonly targetIds: readonly string[];
  readonly summary?: SharedDriveMoveSummary;
}

export interface CellsBinOperationController {
  start(input: StartBinOperationInput): boolean;
  getSnapshot(drive: QualifiedId): BinOperation | undefined;
  subscribe(listener: () => void): () => void;
  recheck(drive: QualifiedId): Promise<void>;
  recheckAll(): Promise<void>;
  acknowledgeRefresh(drive: QualifiedId, operationId: number): void;
  dispose(): void;
}

interface Operation {
  snapshot: BinOperation;
  hasTerminalEvidence: boolean;
  hasUntrackableJobs: boolean;
  hasJobFailure: boolean;
  tracking?: AbortController;
  recheck?: Promise<void>;
  deadline?: ReturnType<Clock['setTimeout']>;
}

interface CreateCellsBinOperationControllerOptions {
  readonly cellsRepository: Pick<
    CellsRepository,
    'deleteNodes' | 'lookupNodeByPath' | 'getBackgroundActionInfo' | 'getBackgroundMoveInfo' | 'getNode'
  >;
  readonly clock: Clock;
}

const getDriveKey = ({id, domain}: QualifiedId): string => {
  return `${id}@${domain}`;
};

const freezeOperation = (operation: BinOperation): BinOperation => {
  return Object.freeze({
    ...operation,
    drive: Object.freeze({...operation.drive}),
    targetIds: Object.freeze([...operation.targetIds]),
    jobUuids: Object.freeze([...operation.jobUuids]),
    ...(operation.summary === undefined
      ? {}
      : {
          summary: Object.freeze({
            ...operation.summary,
            items: Object.freeze(
              operation.summary.items.map(item => {
                return Object.freeze({...item});
              }),
            ),
          }),
        }),
  });
};

const isAuthoritativeRejection = (error: unknown): boolean => {
  return (
    error instanceof BackendError &&
    error.code !== undefined &&
    error.code >= StatusCode.BAD_REQUEST &&
    error.code < StatusCode.INTERNAL_SERVER_ERROR &&
    error.code !== StatusCode.REQUEST_TIMEOUT
  );
};

export const createCellsBinOperationController = ({
  cellsRepository,
  clock,
}: CreateCellsBinOperationControllerOptions): CellsBinOperationController => {
  // Like direct uploads, work belongs to this application-owned instance, not its subscribers.
  const operations = new Map<string, Operation>();
  const listeners = new Set<() => void>();
  let nextId = 0;
  let disposed = false;

  const isCurrent = (operation: Operation): boolean => {
    return !disposed && operations.get(getDriveKey(operation.snapshot.drive)) === operation;
  };
  const update = (operation: Operation, changes: Partial<BinOperation>): void => {
    operation.snapshot = freezeOperation({...operation.snapshot, ...changes});
    for (const listener of listeners) {
      listener();
    }
  };
  const stopTracking = (operation: Operation): void => {
    operation.tracking?.abort();
    operation.tracking = undefined;
  };
  const clearDeadline = (operation: Operation): void => {
    if (operation.deadline !== undefined) {
      clock.clearTimeout(operation.deadline);
      operation.deadline = undefined;
    }
  };
  const startDeadline = (operation: Operation): void => {
    if (operation.snapshot.kind !== 'permanent-delete' || operation.deadline !== undefined) {
      return;
    }
    operation.deadline = clock.setTimeout(() => {
      stopTracking(operation);
      operation.deadline = undefined;
      update(operation, {
        ...(operation.hasTerminalEvidence
          ? {}
          : {state: 'needs-review', reason: operation.hasJobFailure ? 'job-failed' : 'timed-out'}),
        needsRefresh: false,
      });
    }, RECONCILIATION_TIMEOUT_MS);
  };
  const complete = (operation: Operation, reason?: 'partial' | 'job-failed'): void => {
    stopTracking(operation);
    operation.hasTerminalEvidence = true;
    operation.hasJobFailure ||= reason !== undefined;
    startDeadline(operation);
    update(operation, {state: reason === undefined ? 'completed' : 'needs-review', reason, needsRefresh: true});
  };
  const unresolved = (operation: Operation, reason: 'request-failed' | 'status-unknown'): void => {
    startDeadline(operation);
    update(operation, {
      state: operation.snapshot.kind === 'permanent-delete' ? 'processing' : 'needs-review',
      reason: operation.hasJobFailure ? 'job-failed' : reason,
      needsRefresh: true,
    });
  };
  const reject = (operation: Operation): void => {
    stopTracking(operation);
    clearDeadline(operation);
    update(operation, {state: 'rejected', reason: undefined, needsRefresh: false, isLocked: false});
  };

  const applyJobOutcome = (operation: Operation, outcome: CellsBackgroundActionOutcome): void => {
    if (operation.hasUntrackableJobs || outcome === 'status-unknown' || outcome === 'check-limit') {
      unresolved(operation, 'status-unknown');
      return;
    }
    const reason = outcome === 'mixed-terminal' ? 'partial' : undefined;
    complete(operation, reason ?? (outcome === 'all-failed' || operation.hasJobFailure ? 'job-failed' : undefined));
  };
  const jobReader = (
    operation: Operation,
    tracking: AbortController,
  ): Pick<CellsRepository, 'getBackgroundActionInfo'> => {
    return {
      getBackgroundActionInfo: async request => {
        const response = await cellsRepository.getBackgroundActionInfo(request);
        if (
          !tracking.signal.aborted &&
          (response.Status === JobsTaskStatus.Error || response.Status === JobsTaskStatus.Interrupted)
        ) {
          operation.hasJobFailure = true;
          update(operation, {reason: 'job-failed'});
        }
        return response;
      },
    };
  };
  const observe = (operation: Operation): void => {
    stopTracking(operation);
    startDeadline(operation);
    const tracking = new AbortController();
    operation.tracking = tracking;
    update(operation, {
      state: 'processing',
      reason: operation.hasJobFailure ? 'job-failed' : undefined,
      needsRefresh: operation.snapshot.kind === 'permanent-delete',
    });
    const cancel = observeCellsBackgroundActionJobs({
      actionName: 'delete',
      cellsRepository: jobReader(operation, tracking),
      jobUuids: operation.snapshot.jobUuids,
      clock,
      isCurrent: () => {
        return !tracking.signal.aborted && isCurrent(operation);
      },
      pollingPolicy: {
        pollIntervalMs: POLL_INTERVAL_MS,
        maxUnknownRetries: 5,
        maxPollAttempts: Maybe.nothing(),
        getUnknownRetryDelay: retryIndex => {
          return POLL_INTERVAL_MS * RETRY_BACKOFF_BASE ** retryIndex;
        },
      },
      onOutcome: outcome => {
        stopTracking(operation);
        applyJobOutcome(operation, outcome);
      },
    });
    tracking.signal.addEventListener('abort', cancel, {once: true});
  };

  const submit = async (operation: Operation): Promise<void> => {
    const {kind, drive} = operation.snapshot;
    if (kind === 'empty-bin') {
      try {
        const bin = await cellsRepository.lookupNodeByPath({path: getRecycleBinNodePath(drive)});
        if (!isCurrent(operation)) {
          return;
        }
        if (bin?.Type !== TreeNodeType.Collection || typeof bin.Uuid !== 'string' || bin.Uuid.length === 0) {
          reject(operation);
          return;
        }
        update(operation, {targetIds: [bin.Uuid]});
      } catch {
        if (isCurrent(operation)) {
          reject(operation);
        }
        return;
      }
    }
    if (!isCurrent(operation)) {
      return;
    }
    try {
      const response = await cellsRepository.deleteNodes({
        uuids: operation.snapshot.targetIds,
        permanently: kind !== 'move-to-bin',
      });
      if (!isCurrent(operation)) {
        return;
      }
      const evidence = getCellsBackgroundActionEvidence(response, 'delete');
      operation.hasJobFailure = evidence.hasFailedJobs;
      operation.hasUntrackableJobs = (response.BackgroundActions ?? []).some(action => {
        return action.Name !== 'delete' || typeof action.JobUuid !== 'string' || action.JobUuid.length === 0;
      });
      if (evidence.hasCompleted) {
        complete(operation);
      } else if (evidence.jobUuids.length > 0) {
        update(operation, {jobUuids: evidence.jobUuids});
        observe(operation);
      } else if (evidence.hasFailedJobs && !operation.hasUntrackableJobs) {
        complete(operation, 'job-failed');
      } else {
        unresolved(operation, 'status-unknown');
      }
    } catch (error) {
      if (!isCurrent(operation)) {
        return;
      }
      if (isAuthoritativeRejection(error)) {
        reject(operation);
      } else {
        unresolved(operation, 'request-failed');
      }
    }
  };

  const targetsCompleted = async (operation: Operation, signal: AbortSignal): Promise<boolean> => {
    const {kind, targetIds} = operation.snapshot;
    if (kind === 'empty-bin' || targetIds.length === 0) {
      return false;
    }
    for (const uuid of targetIds) {
      if (signal.aborted) {
        return false;
      }
      try {
        const node = await cellsRepository.getNode({uuid});
        if (kind === 'permanent-delete' || node.IsRecycled !== true) {
          return false;
        }
      } catch (error) {
        if (kind !== 'permanent-delete' || !(error instanceof BackendError) || error.code !== StatusCode.NOT_FOUND) {
          return false;
        }
      }
    }
    return !signal.aborted;
  };

  const recheck = (operation: Operation, force = false): Promise<void> => {
    if (operation.recheck !== undefined) {
      return operation.recheck;
    }
    if (!operation.snapshot.isLocked || operation.snapshot.state === 'submitting' || !isCurrent(operation)) {
      return Promise.resolve();
    }
    if (operation.hasTerminalEvidence) {
      startDeadline(operation);
      update(operation, {needsRefresh: true});
      return Promise.resolve();
    }
    if (operation.tracking !== undefined && !force) {
      return Promise.resolve();
    }
    stopTracking(operation);
    const tracking = new AbortController();
    operation.tracking = tracking;
    const timeout = clock.setTimeout(() => {
      return tracking.abort();
    }, RECONCILIATION_TIMEOUT_MS);
    let restartScheduled = false;
    const check = async (): Promise<void> => {
      if (operation.snapshot.jobUuids.length === 0) {
        if (await targetsCompleted(operation, tracking.signal)) {
          complete(operation);
        }
        return;
      }
      const batch = checkCellsBackgroundActionJobs({
        actionName: 'delete',
        cellsRepository: jobReader(operation, tracking),
        jobUuids: operation.snapshot.jobUuids,
        clock,
        isCurrent: () => {
          return !tracking.signal.aborted;
        },
      });
      tracking.signal.addEventListener('abort', batch.cancel, {once: true});
      const result = await batch.result;
      if (tracking.signal.aborted || maybe.isNothing(result)) {
        return;
      }
      operation.hasJobFailure ||= result.value.hasFailedJobs;
      if (!result.value.hasPendingJobs) {
        applyJobOutcome(operation, result.value.hasFailedJobs ? 'all-failed' : 'all-finished');
        return;
      }
      if (operation.snapshot.reason !== 'timed-out') {
        restartScheduled = true;
        const restart = clock.setTimeout(() => {
          return observe(operation);
        }, POLL_INTERVAL_MS);
        tracking.signal.addEventListener(
          'abort',
          () => {
            return clock.clearTimeout(restart);
          },
          {once: true},
        );
      }
    };
    // Cancelling ends the wait even when the HTTP request never settles. The same
    // signal makes its eventual result stale; only the existing job helpers poll.
    const cancelled = new Promise<void>(resolve => {
      tracking.signal.addEventListener(
        'abort',
        () => {
          return resolve();
        },
        {once: true},
      );
    });
    operation.recheck = Promise.race([check(), cancelled])
      .catch(noop)
      .finally(() => {
        clock.clearTimeout(timeout);
        operation.recheck = undefined;
        if (operation.tracking === tracking && !restartScheduled) {
          stopTracking(operation);
        }
      });
    return operation.recheck;
  };

  return {
    start(input) {
      if (disposed || operations.get(getDriveKey(input.drive))?.snapshot.isLocked === true) {
        return false;
      }
      const operation: Operation = {
        snapshot: freezeOperation({
          ...input,
          id: ++nextId,
          jobUuids: [],
          state: 'submitting',
          reason: undefined,
          needsRefresh: false,
          isLocked: true,
        }),
        hasTerminalEvidence: false,
        hasUntrackableJobs: false,
        hasJobFailure: false,
      };
      operations.set(getDriveKey(input.drive), operation);
      for (const listener of listeners) {
        listener();
      }
      void submit(operation);
      return true;
    },
    getSnapshot: drive => {
      return operations.get(getDriveKey(drive))?.snapshot;
    },
    subscribe(listener) {
      if (disposed) {
        return noop;
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    recheck(drive) {
      const operation = operations.get(getDriveKey(drive));
      return operation === undefined ? Promise.resolve() : recheck(operation);
    },
    async recheckAll() {
      await Promise.all(
        [...operations.values()].map(operation => {
          return recheck(operation, true);
        }),
      );
    },
    acknowledgeRefresh(drive, operationId) {
      const operation = operations.get(getDriveKey(drive));
      if (operation?.snapshot.id !== operationId || !operation.hasTerminalEvidence) {
        return;
      }
      clearDeadline(operation);
      update(operation, {needsRefresh: false, isLocked: false});
    },
    dispose() {
      disposed = true;
      for (const operation of operations.values()) {
        stopTracking(operation);
        clearDeadline(operation);
      }
      operations.clear();
      listeners.clear();
    },
  };
};
