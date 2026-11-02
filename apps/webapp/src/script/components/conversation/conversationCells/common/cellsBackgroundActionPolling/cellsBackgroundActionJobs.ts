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

import {isNonEmptyString} from '@sindresorhus/is';
import {
  JobsTaskStatus,
  RestActionStatus,
  type JobsTaskStatus as JobStatus,
  type RestPerformActionResponse,
} from 'cells-sdk-ts';
import {noop} from 'noop-esm';
import {Maybe, maybe, task, type Task} from 'true-myth';

import {pollCellsBackgroundActionJobs, type CellsBackgroundActionPollingOptions} from './cellsBackgroundActionPolling';

import type {CellsRepository} from '../../../../../repositories/cells/cellsRepository';
type CellsBackgroundActionName = 'move' | 'delete' | 'restore';

type CellsBackgroundActionSource =
  | {
      readonly actionName: 'delete' | 'restore';
      readonly cellsRepository: Pick<CellsRepository, 'getBackgroundActionInfo'>;
    }
  | {readonly actionName: 'move'; readonly cellsRepository: Pick<CellsRepository, 'getBackgroundMoveInfo'>};

interface CellsBackgroundActionEvidence {
  readonly jobUuids: readonly string[];
  readonly hasFailedJobs: boolean;
  readonly hasCompleted: boolean;
}

interface CellsBackgroundActionCheck {
  readonly hasPendingJobs: boolean;
  readonly hasFailedJobs: boolean;
}

type ObserveOptions = CellsBackgroundActionSource &
  Omit<CellsBackgroundActionPollingOptions, 'readStatus' | 'onStatusSnapshot'> &
  Partial<Pick<CellsBackgroundActionPollingOptions, 'onStatusSnapshot'>>;

type CheckOptions = CellsBackgroundActionSource &
  Pick<CellsBackgroundActionPollingOptions, 'jobUuids' | 'clock' | 'isCurrent'>;

const isFailedStatus = (status: JobStatus | undefined): boolean => {
  return status === JobsTaskStatus.Error || status === JobsTaskStatus.Interrupted;
};

export const getCellsBackgroundActionEvidence = (
  response: RestPerformActionResponse,
  actionName: CellsBackgroundActionName,
): CellsBackgroundActionEvidence => {
  const actions = response.BackgroundActions ?? [];
  const matchingActions = actions.filter(action => {
    return action.Name === actionName;
  });
  return {
    jobUuids: [
      ...new Set(
        matchingActions.flatMap(action => {
          return isNonEmptyString(action.JobUuid) ? [action.JobUuid] : [];
        }),
      ),
    ],
    hasFailedJobs: matchingActions.some(action => {
      return isFailedStatus(action.Status);
    }),
    // Unrelated or unidentified actions are not evidence of completed work.
    hasCompleted:
      response.Status === RestActionStatus.Performed &&
      actions.every(action => {
        return (
          action.Name === actionName && isNonEmptyString(action.JobUuid) && action.Status === JobsTaskStatus.Finished
        );
      }),
  };
};

const readStatus = (source: CellsBackgroundActionSource, jobUuid: string): Task<Maybe<JobStatus>, unknown> => {
  return task.tryOrElse(
    error => {
      return error;
    },
    async () => {
      const response = await (source.actionName === 'move'
        ? source.cellsRepository.getBackgroundMoveInfo({jobUuid})
        : source.cellsRepository.getBackgroundActionInfo({name: source.actionName, jobUuid}));
      return Maybe.of<JobStatus>(response.Status);
    },
  );
};

export const observeCellsBackgroundActionJobs = (options: ObserveOptions): (() => void) => {
  return pollCellsBackgroundActionJobs({
    ...options,
    readStatus: jobUuid => {
      return readStatus(options, jobUuid);
    },
    onStatusSnapshot: options.onStatusSnapshot ?? noop,
  });
};

// One batch only: unknown/rejected reads remain pending evidence, not cancellation.
// Nothing means cancellation/stale scope. Refresh cadence and deadlines belong to callers.
export const checkCellsBackgroundActionJobs = (
  options: CheckOptions,
): Readonly<{result: Promise<Maybe<CellsBackgroundActionCheck>>; cancel: () => void}> => {
  const {jobUuids, clock, isCurrent} = options;
  let cancel = noop;
  const result = new Promise<Maybe<CellsBackgroundActionCheck>>(resolve => {
    if (!isCurrent()) {
      resolve(Maybe.nothing());
      return;
    }
    if (jobUuids.length === 0) {
      resolve(Maybe.just({hasPendingJobs: false, hasFailedJobs: false}));
      return;
    }

    let hasFailedJobs = false;
    const cancelPolling = pollCellsBackgroundActionJobs({
      jobUuids,
      clock,
      isCurrent: () => {
        if (isCurrent()) {
          return true;
        }
        resolve(Maybe.nothing());
        return false;
      },
      readStatus: jobUuid => {
        return readStatus(options, jobUuid).map(status => {
          if (maybe.isJust(status) && isFailedStatus(status.value)) {
            hasFailedJobs = true;
          }
          return status;
        });
      },
      pollingPolicy: {
        pollIntervalMs: 0,
        maxUnknownRetries: 0,
        getUnknownRetryDelay: () => {
          return 0;
        },
        maxPollAttempts: Maybe.just(1),
      },
      onStatusSnapshot: noop,
      onOutcome: outcome => {
        resolve(Maybe.just({hasPendingJobs: outcome === 'check-limit' || outcome === 'status-unknown', hasFailedJobs}));
      },
    });
    cancel = () => {
      cancelPolling();
      resolve(Maybe.nothing());
    };
  });
  return Object.freeze({result, cancel});
};
