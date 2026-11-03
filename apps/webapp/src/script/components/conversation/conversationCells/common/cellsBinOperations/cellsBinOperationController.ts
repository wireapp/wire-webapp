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
const READONLY_RECHECK_TIMEOUT_MS = 20_000;

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
  hasUntrackableJobs: boolean;
  terminalState: 'completed' | 'needs-review' | undefined;
  terminalReason: BinOperationReason | undefined;
  hasKnownJobFailure: boolean;
  generation: number;
  pollingCycle: number;
  cancelPolling: (() => void) | undefined;
  cancelCheck: (() => void) | undefined;
  recheckPromise: Promise<void> | undefined;
  recheckAttemptId: number;
  cancelRecheck: (() => void) | undefined;
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
    operation.pollingCycle += 1;
    operation.recheckAttemptId += 1;
    operation.cancelRecheck?.();
    operation.cancelRecheck = undefined;
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
    operation.terminalState = state;
    operation.terminalReason = reason;
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

  const createBackgroundActionReader = (
    operation: InternalOperation,
    isCurrentRead: () => boolean,
  ): Pick<CellsRepository, 'getBackgroundActionInfo'> => {
    return {
      getBackgroundActionInfo: async request => {
        const response = await cellsRepository.getBackgroundActionInfo(request);
        if (
          isCurrentRead() &&
          (response.Status === JobsTaskStatus.Error || response.Status === JobsTaskStatus.Interrupted)
        ) {
          operation.hasKnownJobFailure = true;
          update(operation, {reason: 'job-failed'});
        }
        return response;
      },
    };
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
      current.pollingCycle += 1;
      current.recheckAttemptId += 1;
      current.cancelRecheck?.();
      current.cancelRecheck = undefined;
      current.cancelCheck?.();
      current.cancelCheck = undefined;
      clearRestartTimeout(current);
      current.deadline = undefined;
      current.isLocked = true;
      if (current.hasKnownTerminalEvidence) {
        update(current, {
          state: current.terminalState ?? current.snapshot.state,
          reason: current.terminalReason,
          needsRefresh: false,
          isLocked: true,
        });
        return;
      }
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
    if (operation.hasUntrackableJobs) {
      setUnresolvedOutcome(operation, 'status-unknown');
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
    operation.pollingCycle += 1;
    startDeadline(operation);
    const generation = operation.generation;
    const pollingCycle = operation.pollingCycle;
    const {id, drive, jobUuids} = operation.snapshot;
    const pollingRepository = createBackgroundActionReader(operation, () => {
      return isCurrent(operation) && operation.pollingCycle === pollingCycle;
    });
    operation.cancelPolling = observeCellsBackgroundActionJobs({
      cellsRepository: pollingRepository,
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
      operation.hasUntrackableJobs = (response.BackgroundActions ?? []).some(action => {
        return action.Name !== 'delete' || typeof action.JobUuid !== 'string' || action.JobUuid.length === 0;
      });
      operation.hasKnownJobFailure ||= evidence.hasFailedJobs;
      if (evidence.hasCompleted) {
        setTerminalOutcome(operation, 'completed', undefined);
        return;
      }

      if (evidence.jobUuids.length > 0) {
        update(operation, {jobUuids: evidence.jobUuids});
        beginPolling(operation);
        return;
      }

      if (evidence.hasFailedJobs) {
        if (operation.hasUntrackableJobs) {
          setUnresolvedOutcome(operation, 'status-unknown');
        } else {
          setTerminalOutcome(operation, 'needs-review', 'job-failed');
        }
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
      hasUntrackableJobs: false,
      terminalState: undefined,
      terminalReason: undefined,
      hasKnownJobFailure: false,
      generation: (existing?.generation ?? 0) + 1,
      pollingCycle: 0,
      cancelPolling: undefined,
      cancelCheck: undefined,
      recheckPromise: undefined,
      recheckAttemptId: 0,
      cancelRecheck: undefined,
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

  const hasAuthoritativeCompletion = async (
    operation: InternalOperation,
    isCurrentAttempt: () => boolean,
  ): Promise<boolean> => {
    const {kind, targetIds} = operation.snapshot;
    if (kind === 'empty-bin' || targetIds.length === 0) {
      return false;
    }

    for (const uuid of targetIds) {
      if (!isCurrentAttempt()) {
        return false;
      }
      try {
        const node = await cellsRepository.getNode({uuid});
        if (!isCurrentAttempt()) {
          return false;
        }
        if (kind === 'permanent-delete' || node.IsRecycled !== true) {
          return false;
        }
      } catch (error) {
        if (!isCurrentAttempt() || kind !== 'permanent-delete') {
          return false;
        }
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
    if (operation.hasKnownTerminalEvidence) {
      if (operation.snapshot.kind === 'permanent-delete') {
        startDeadline(operation);
      }
      operation.isLocked = true;
      update(operation, {
        state: operation.terminalState ?? operation.snapshot.state,
        reason: operation.terminalReason,
        needsRefresh: true,
        isLocked: true,
      });
      return Promise.resolve();
    }

    const {id, drive, jobUuids} = operation.snapshot;
    const generation = operation.generation;
    const driveKey = getDriveKey(drive);
    const attemptId = ++operation.recheckAttemptId;
    let isAborted = false;
    let isSettled = false;
    let timeout: ReturnType<Clock['setTimeout']> | undefined;
    let cancelRead = noop;
    let resolveAbort: (() => void) | undefined;
    const isCurrentAttempt = (): boolean => {
      return (
        !isAborted &&
        !isSettled &&
        operation.recheckAttemptId === attemptId &&
        getCurrentOperation(driveKey, id, generation) !== undefined
      );
    };
    const clearAttempt = (): void => {
      if (timeout !== undefined) {
        clock.clearTimeout(timeout);
        timeout = undefined;
      }
      if (operation.cancelRecheck === abort) {
        operation.cancelRecheck = undefined;
      }
      if (operation.cancelCheck === cancelRead) {
        operation.cancelCheck = undefined;
      }
    };
    const abort = (): void => {
      if (isAborted || isSettled) {
        return;
      }
      isAborted = true;
      if (operation.recheckAttemptId === attemptId) {
        operation.recheckAttemptId += 1;
      }
      clearAttempt();
      cancelRead();
      resolveAbort?.();
    };
    const aborted = new Promise<void>(resolve => {
      resolveAbort = resolve;
    });
    operation.cancelRecheck = abort;
    timeout = clock.setTimeout(abort, READONLY_RECHECK_TIMEOUT_MS);

    const runRead = async (): Promise<
      | {readonly kind: 'authoritative'; readonly isComplete: boolean}
      | {readonly kind: 'jobs'; readonly hasPendingJobs: boolean; readonly hasFailedJobs: boolean}
      | undefined
    > => {
      try {
        if (jobUuids.length === 0) {
          const isComplete = await hasAuthoritativeCompletion(operation, isCurrentAttempt);
          return isCurrentAttempt() ? {kind: 'authoritative', isComplete} : undefined;
        }

        if (force) {
          operation.cancelPolling?.();
          operation.cancelPolling = undefined;
        }
        const check = checkCellsBackgroundActionJobs({
          cellsRepository: createBackgroundActionReader(operation, isCurrentAttempt),
          actionName: 'delete',
          jobUuids,
          clock,
          isCurrent: isCurrentAttempt,
        });
        cancelRead = check.cancel;
        operation.cancelCheck = cancelRead;
        const result = await check.result;
        if (!isCurrentAttempt() || maybe.isNothing(result)) {
          return undefined;
        }
        return {
          kind: 'jobs',
          hasPendingJobs: result.value.hasPendingJobs,
          hasFailedJobs: result.value.hasFailedJobs,
        };
      } catch {
        // Failed reads are not evidence that an operation completed.
        return undefined;
      }
    };

    const runCheck = async (): Promise<void> => {
      const result = await Promise.race([
        runRead(),
        aborted.then(() => {
          return undefined;
        }),
      ]);
      if (!isCurrentAttempt() || result === undefined) {
        return;
      }
      isSettled = true;
      clearAttempt();
      const current = getCurrentOperation(driveKey, id, generation);
      if (current === undefined) {
        return;
      }
      if (result.kind === 'authoritative') {
        if (result.isComplete) {
          setTerminalOutcome(current, 'completed', undefined);
        }
        return;
      }
      if (result.hasPendingJobs) {
        if (result.hasFailedJobs) {
          current.hasKnownJobFailure = true;
          update(current, {reason: 'job-failed'});
        }
        const hasExpiredDeadline = current.snapshot.reason === 'timed-out' && current.deadline === undefined;
        if (!hasExpiredDeadline) {
          schedulePollingRestart(current);
        }
        return;
      }
      if (current.hasUntrackableJobs) {
        current.hasKnownJobFailure ||= result.hasFailedJobs;
        setUnresolvedOutcome(current, 'status-unknown');
        return;
      }
      setTerminalOutcome(
        current,
        result.hasFailedJobs ? 'needs-review' : 'completed',
        result.hasFailedJobs ? 'job-failed' : undefined,
      );
    };

    const checkPromise = runCheck().finally(() => {
      if (!isAborted && !isSettled) {
        isSettled = true;
        clearAttempt();
      }
      if (operation.recheckPromise === checkPromise) {
        operation.recheckPromise = undefined;
      }
    });
    operation.recheckPromise = checkPromise;
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
