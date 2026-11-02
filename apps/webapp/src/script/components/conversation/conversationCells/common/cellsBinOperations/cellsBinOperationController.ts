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
import {JobsTaskStatus, RestActionStatus, TreeNodeType} from 'cells-sdk-ts';
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

const BACKGROUND_ACTION_POLL_INTERVAL_MS = 1000;
const EXPONENTIAL_BACKOFF_BASE = 2;
const MAX_BACKGROUND_ACTION_UNKNOWN_RETRIES = 5;
const PERMANENT_DELETE_DEADLINE_MS = 20_000;

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

interface InternalOperation {
  snapshot: BinOperation;
  isLocked: boolean;
  hasKnownTerminalEvidence: boolean;
  hasKnownJobFailure: boolean;
  generation: number;
  cancelPolling: (() => void) | undefined;
  cancelCheck: (() => void) | undefined;
  recheckPromise: Promise<void> | undefined;
  restartTimeout: ReturnType<Clock['setTimeout']> | undefined;
  deadline: ReturnType<Clock['setTimeout']> | undefined;
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
            destinationPath: operation.summary.destinationPath,
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
  const operations = new Map<string, InternalOperation>();
  const listeners = new Set<() => void>();
  let nextOperationId = 0;
  let isDisposed = false;

  const notify = (): void => {
    if (isDisposed) {
      return;
    }
    for (const listener of listeners) {
      listener();
    }
  };

  const getCurrentOperation = (
    driveKey: string,
    operationId: number,
    generation: number,
  ): InternalOperation | undefined => {
    const operation = operations.get(driveKey);
    if (isDisposed || operation?.snapshot.id !== operationId || operation.generation !== generation) {
      return undefined;
    }
    return operation;
  };

  const update = (operation: InternalOperation, changes: Partial<BinOperation>): void => {
    operation.snapshot = freezeOperation({...operation.snapshot, ...changes});
    notify();
  };

  const clearDeadline = (operation: InternalOperation): void => {
    if (operation.deadline === undefined) {
      return;
    }
    clock.clearTimeout(operation.deadline);
    operation.deadline = undefined;
  };

  const clearRestartTimeout = (operation: InternalOperation): void => {
    if (operation.restartTimeout === undefined) {
      return;
    }
    clock.clearTimeout(operation.restartTimeout);
    operation.restartTimeout = undefined;
  };

  const stopJobTracking = (operation: InternalOperation, keepDeadline = false): void => {
    operation.cancelPolling?.();
    operation.cancelPolling = undefined;
    operation.cancelCheck?.();
    operation.cancelCheck = undefined;
    clearRestartTimeout(operation);
    if (!keepDeadline) {
      clearDeadline(operation);
    }
  };

  const setTerminalOutcome = (
    operation: InternalOperation,
    state: 'completed' | 'needs-review',
    reason: BinOperationReason | undefined,
  ): void => {
    const hasKnownTerminalEvidence = state === 'completed' || reason === 'partial' || reason === 'job-failed';
    operation.hasKnownTerminalEvidence ||= hasKnownTerminalEvidence;
    operation.hasKnownJobFailure ||= reason === 'job-failed' || reason === 'partial';
    const keepDeadline = operation.snapshot.kind === 'permanent-delete';
    if (keepDeadline) {
      startDeadline(operation);
    }
    stopJobTracking(operation, keepDeadline);
    operation.isLocked = true;
    update(operation, {state, reason, needsRefresh: true, isLocked: true});
  };

  const setRejected = (operation: InternalOperation): void => {
    stopJobTracking(operation);
    operation.isLocked = false;
    update(operation, {state: 'rejected', reason: undefined, needsRefresh: false, isLocked: false});
  };

  const isCurrent = (operation: InternalOperation): boolean => {
    return (
      !isDisposed &&
      operations.get(getDriveKey(operation.snapshot.drive)) === operation &&
      operation.generation === operations.get(getDriveKey(operation.snapshot.drive))?.generation
    );
  };

  const startDeadline = (operation: InternalOperation): void => {
    if (operation.snapshot.kind !== 'permanent-delete' || operation.deadline !== undefined) {
      return;
    }
    const {id, drive} = operation.snapshot;
    const generation = operation.generation;
    operation.deadline = clock.setTimeout(() => {
      const current = getCurrentOperation(getDriveKey(drive), id, generation);
      if (current === undefined) {
        return;
      }
      current.cancelPolling?.();
      current.cancelPolling = undefined;
      current.cancelCheck?.();
      current.cancelCheck = undefined;
      clearRestartTimeout(current);
      current.deadline = undefined;
      current.isLocked = true;
      const reason =
        current.snapshot.reason === 'job-failed' || current.snapshot.reason === 'partial'
          ? current.snapshot.reason
          : 'timed-out';
      update(current, {state: 'needs-review', reason, needsRefresh: false, isLocked: true});
    }, PERMANENT_DELETE_DEADLINE_MS);
  };

  const setUnresolvedOutcome = (operation: InternalOperation, reason: 'request-failed' | 'status-unknown'): void => {
    const effectiveReason = operation.hasKnownJobFailure ? 'job-failed' : reason;
    if (operation.snapshot.kind === 'permanent-delete') {
      startDeadline(operation);
      operation.isLocked = true;
      update(operation, {state: 'processing', reason: effectiveReason, needsRefresh: true, isLocked: true});
      return;
    }
    operation.isLocked = true;
    update(operation, {state: 'needs-review', reason: effectiveReason, needsRefresh: true, isLocked: true});
  };

  const onPollingOutcome = (operation: InternalOperation, outcome: string): void => {
    operation.cancelPolling = undefined;
    if (!isCurrent(operation)) {
      return;
    }
    if (outcome === 'all-finished') {
      setTerminalOutcome(
        operation,
        operation.hasKnownJobFailure ? 'needs-review' : 'completed',
        operation.hasKnownJobFailure ? 'job-failed' : undefined,
      );
      return;
    }
    if (outcome === 'mixed-terminal') {
      setTerminalOutcome(operation, 'needs-review', 'partial');
      return;
    }
    if (outcome === 'all-failed') {
      setTerminalOutcome(operation, 'needs-review', 'job-failed');
      return;
    }
    setUnresolvedOutcome(operation, operation.hasKnownJobFailure ? 'request-failed' : 'status-unknown');
  };

  const beginPolling = (operation: InternalOperation): void => {
    operation.cancelPolling?.();
    operation.cancelPolling = undefined;
    startDeadline(operation);
    const generation = operation.generation;
    const {id, drive, jobUuids} = operation.snapshot;
    operation.cancelPolling = observeCellsBackgroundActionJobs({
      cellsRepository,
      actionName: 'delete',
      jobUuids,
      clock,
      pollingPolicy: {
        pollIntervalMs: BACKGROUND_ACTION_POLL_INTERVAL_MS,
        maxUnknownRetries: MAX_BACKGROUND_ACTION_UNKNOWN_RETRIES,
        maxPollAttempts: Maybe.nothing(),
        getUnknownRetryDelay: retryIndex => {
          return BACKGROUND_ACTION_POLL_INTERVAL_MS * EXPONENTIAL_BACKOFF_BASE ** retryIndex;
        },
      },
      isCurrent: () => {
        return getCurrentOperation(getDriveKey(drive), id, generation) !== undefined;
      },
      onStatusSnapshot(statuses) {
        if (
          statuses.some(status => {
            return status === JobsTaskStatus.Error || status === JobsTaskStatus.Interrupted;
          })
        ) {
          operation.hasKnownJobFailure = true;
        }
      },
      onOutcome: outcome => {
        onPollingOutcome(operation, outcome);
      },
    });
    operation.isLocked = true;
    update(operation, {
      state: 'processing',
      reason: operation.hasKnownJobFailure ? 'job-failed' : undefined,
      needsRefresh: operation.snapshot.kind === 'permanent-delete',
      isLocked: true,
    });
  };

  const submit = async (operation: InternalOperation): Promise<void> => {
    const {kind, drive, targetIds} = operation.snapshot;
    let uuids = targetIds;

    if (kind === 'empty-bin') {
      try {
        const binNode = await cellsRepository.lookupNodeByPath({path: getRecycleBinNodePath(drive)});
        if (!isCurrent(operation)) {
          return;
        }
        if (
          binNode === undefined ||
          binNode.Type !== TreeNodeType.Collection ||
          typeof binNode.Uuid !== 'string' ||
          binNode.Uuid.length === 0
        ) {
          setRejected(operation);
          return;
        }
        uuids = [binNode.Uuid];
        update(operation, {targetIds: uuids});
      } catch {
        if (isCurrent(operation)) {
          setRejected(operation);
        }
        return;
      }
    }

    if (!isCurrent(operation)) {
      return;
    }

    try {
      const response = await cellsRepository.deleteNodes({uuids, permanently: kind !== 'move-to-bin'});
      if (!isCurrent(operation)) {
        return;
      }

      const evidence = getCellsBackgroundActionEvidence(response, 'delete');
      if (evidence.hasCompleted) {
        setTerminalOutcome(operation, 'completed', undefined);
        return;
      }

      if (evidence.jobUuids.length > 0) {
        update(operation, {jobUuids: evidence.jobUuids});
        operation.hasKnownJobFailure ||= evidence.hasFailedJobs;
        beginPolling(operation);
        return;
      }

      if (evidence.hasFailedJobs) {
        setTerminalOutcome(operation, 'needs-review', 'job-failed');
        return;
      }

      if (response.Status !== RestActionStatus.Performed) {
        setUnresolvedOutcome(operation, 'status-unknown');
        return;
      }

      // A performed response with unidentified or non-terminal background evidence is ambiguous.
      setUnresolvedOutcome(operation, 'status-unknown');
    } catch (error) {
      if (!isCurrent(operation)) {
        return;
      }
      if (isAuthoritativeRejection(error)) {
        setRejected(operation);
        return;
      }
      setUnresolvedOutcome(operation, 'request-failed');
    }
  };

  const start = (input: StartBinOperationInput): boolean => {
    if (isDisposed) {
      return false;
    }
    const driveKey = getDriveKey(input.drive);
    const existing = operations.get(driveKey);
    if (existing !== undefined && existing.isLocked) {
      return false;
    }

    const operation = {
      snapshot: freezeOperation({
        id: ++nextOperationId,
        kind: input.kind,
        drive: input.drive,
        path: input.path,
        targetIds: input.targetIds,
        jobUuids: [],
        summary: input.summary,
        state: 'submitting',
        reason: undefined,
        needsRefresh: false,
        isLocked: true,
      }),
      isLocked: true,
      hasKnownTerminalEvidence: false,
      hasKnownJobFailure: false,
      generation: (existing?.generation ?? 0) + 1,
      cancelPolling: undefined,
      cancelCheck: undefined,
      recheckPromise: undefined,
      restartTimeout: undefined,
      deadline: undefined,
    } satisfies InternalOperation;
    operations.set(driveKey, operation);
    notify();
    void submit(operation);
    return true;
  };

  const getSnapshot = (drive: QualifiedId): BinOperation | undefined => {
    return operations.get(getDriveKey(drive))?.snapshot;
  };

  const hasAuthoritativeCompletion = async (operation: InternalOperation): Promise<boolean> => {
    const {kind, targetIds} = operation.snapshot;
    if (kind === 'empty-bin' || targetIds.length === 0) {
      return false;
    }

    if (kind === 'move-to-bin') {
      const nodes = await Promise.all(
        targetIds.map(uuid => {
          return cellsRepository.getNode({uuid});
        }),
      );
      return nodes.every(node => {
        return node.IsRecycled === true;
      });
    }

    for (const uuid of targetIds) {
      try {
        await cellsRepository.getNode({uuid});
        return false;
      } catch (error) {
        if (!(error instanceof BackendError) || error.code !== StatusCode.NOT_FOUND) {
          return false;
        }
      }
    }
    return true;
  };

  const schedulePollingRestart = (operation: InternalOperation): void => {
    if (operation.restartTimeout !== undefined) {
      return;
    }
    operation.restartTimeout = clock.setTimeout(() => {
      operation.restartTimeout = undefined;
      if (isCurrent(operation) && operation.isLocked) {
        beginPolling(operation);
      }
    }, BACKGROUND_ACTION_POLL_INTERVAL_MS);
  };

  const recheckOperation = (operation: InternalOperation, force: boolean): Promise<void> => {
    if (operation.recheckPromise !== undefined) {
      return operation.recheckPromise;
    }
    if (!operation.isLocked || operation.snapshot.state === 'submitting' || isDisposed) {
      return Promise.resolve();
    }
    if (operation.cancelPolling !== undefined && !force) {
      return Promise.resolve();
    }

    const {id, drive, jobUuids} = operation.snapshot;
    const generation = operation.generation;
    const driveKey = getDriveKey(drive);
    const runCheck = async (): Promise<void> => {
      if (jobUuids.length === 0) {
        try {
          const isComplete = await hasAuthoritativeCompletion(operation);
          const current = getCurrentOperation(driveKey, id, generation);
          if (isComplete && current !== undefined) {
            setTerminalOutcome(current, 'completed', undefined);
          }
        } catch {
          // Failed reads are not evidence that an operation completed.
        }
        return;
      }

      if (force) {
        operation.cancelPolling?.();
        operation.cancelPolling = undefined;
      }
      operation.cancelCheck?.();
      const check = checkCellsBackgroundActionJobs({
        cellsRepository,
        actionName: 'delete',
        jobUuids,
        clock,
        isCurrent: () => {
          return getCurrentOperation(driveKey, id, generation) !== undefined;
        },
      });
      operation.cancelCheck = check.cancel;
      const result = await check.result;
      if (maybe.isNothing(result)) {
        return;
      }

      const current = getCurrentOperation(driveKey, id, generation);
      if (current === undefined) {
        return;
      }
      current.cancelCheck = undefined;
      if (result.value.hasPendingJobs) {
        const hasExpiredDeadline = current.snapshot.reason === 'timed-out' && current.deadline === undefined;
        if (!hasExpiredDeadline) {
          schedulePollingRestart(current);
        }
        return;
      }
      setTerminalOutcome(
        current,
        result.value.hasFailedJobs ? 'needs-review' : 'completed',
        result.value.hasFailedJobs ? 'job-failed' : undefined,
      );
    };

    const checkPromise = runCheck();
    operation.recheckPromise = checkPromise;
    void checkPromise.then(
      () => {
        if (operation.recheckPromise === checkPromise) {
          operation.recheckPromise = undefined;
        }
      },
      () => {
        if (operation.recheckPromise === checkPromise) {
          operation.recheckPromise = undefined;
        }
      },
    );
    return checkPromise;
  };

  const recheck = (drive: QualifiedId): Promise<void> => {
    const operation = operations.get(getDriveKey(drive));
    return operation === undefined ? Promise.resolve() : recheckOperation(operation, false);
  };

  const recheckAll = async (): Promise<void> => {
    const activeOperations = [...operations.values()].filter(operation => {
      return operation.isLocked;
    });
    await Promise.all(
      activeOperations.map(operation => {
        return recheckOperation(operation, true);
      }),
    );
  };

  const acknowledgeRefresh = (drive: QualifiedId, operationId: number): void => {
    const operation = operations.get(getDriveKey(drive));
    if (operation === undefined || operation.snapshot.id !== operationId || !operation.hasKnownTerminalEvidence) {
      return;
    }
    clearDeadline(operation);
    operation.isLocked = false;
    update(operation, {needsRefresh: false, isLocked: false});
  };

  const dispose = (): void => {
    if (isDisposed) {
      return;
    }
    isDisposed = true;
    for (const operation of operations.values()) {
      operation.generation += 1;
      stopJobTracking(operation);
    }
    operations.clear();
    listeners.clear();
  };

  return {
    start,
    getSnapshot,
    subscribe(listener) {
      if (isDisposed) {
        return noop;
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    recheck,
    recheckAll,
    acknowledgeRefresh,
    dispose,
  };
};
