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
import {JobsTaskStatus, type JobsTaskStatus as JobsTaskStatusValue} from 'cells-sdk-ts';
import {noop} from 'noop-esm';
import {Maybe, maybe, type Task} from 'true-myth';

export type CellsBackgroundActionOutcome =
  'all-finished' | 'mixed-terminal' | 'all-failed' | 'status-unknown' | 'check-limit';

export interface CellsBackgroundActionPollingPolicy {
  readonly pollIntervalMs: number;
  readonly maxUnknownRetries: number;
  readonly getUnknownRetryDelay: (retryIndex: number) => number;
  readonly maxPollAttempts: Maybe<number>;
}

export interface CellsBackgroundActionPollingOptions {
  readonly jobUuids: readonly string[];
  readonly readStatus: (jobUuid: string) => Task<Maybe<JobsTaskStatusValue>, unknown>;
  readonly clock: Clock;
  readonly pollingPolicy: CellsBackgroundActionPollingPolicy;
  readonly isCurrent: () => boolean;
  readonly onStatusSnapshot: (statuses: readonly JobsTaskStatusValue[]) => void;
  readonly onOutcome: (outcome: CellsBackgroundActionOutcome) => void;
}

export type CancelCellsBackgroundActionPolling = () => void;

export const pollCellsBackgroundActionJobs = ({
  jobUuids,
  readStatus,
  clock,
  pollingPolicy,
  isCurrent,
  onStatusSnapshot,
  onOutcome,
}: CellsBackgroundActionPollingOptions): CancelCellsBackgroundActionPolling => {
  const uniqueJobUuids = [...new Set(jobUuids)];
  if (uniqueJobUuids.length === 0) {
    return noop;
  }

  let isActive = true;
  let timeout: Maybe<ReturnType<typeof clock.setTimeout>> = Maybe.nothing();
  let unknownRetryCount = 0;
  let pollAttemptCount = 0;

  const clearScheduledCheck = (): void => {
    if (maybe.isNothing(timeout)) {
      return;
    }

    clock.clearTimeout(timeout.value);
    timeout = Maybe.nothing();
  };

  const cancel = (): void => {
    if (!isActive) {
      return;
    }

    isActive = false;
    clearScheduledCheck();
  };

  const canContinue = (): boolean => {
    if (!isActive) {
      return false;
    }

    if (!isCurrent()) {
      cancel();
      return false;
    }

    return true;
  };

  const finish = (outcome: CellsBackgroundActionOutcome): void => {
    if (!canContinue()) {
      return;
    }

    isActive = false;
    clearScheduledCheck();
    onOutcome(outcome);
  };

  const scheduleNextCheck = (delay: number): void => {
    if (!canContinue()) {
      return;
    }

    timeout = Maybe.just(
      clock.setTimeout(() => {
        timeout = Maybe.nothing();
        void checkStatuses();
      }, delay),
    );
  };

  const hasReachedPollLimit = (): boolean => {
    return maybe.isJust(pollingPolicy.maxPollAttempts) && pollAttemptCount >= pollingPolicy.maxPollAttempts.value;
  };

  const checkStatuses = async (): Promise<void> => {
    if (!canContinue()) {
      return;
    }

    pollAttemptCount += 1;
    const statusResults = await Promise.all(
      uniqueJobUuids.map(jobUuid => {
        return readStatus(jobUuid);
      }),
    );
    if (!canContinue()) {
      return;
    }

    const statuses = statusResults.map(statusResult => {
      return statusResult.match({
        Ok: status => {
          return status;
        },
        Err: () => {
          return Maybe.nothing<JobsTaskStatusValue>();
        },
      });
    });
    const hasUnknownStatus = statuses.some(status => {
      return maybe.isNothing(status) || status.value === JobsTaskStatus.Unknown;
    });
    if (hasUnknownStatus) {
      if (unknownRetryCount >= pollingPolicy.maxUnknownRetries) {
        finish('status-unknown');
        return;
      }

      if (hasReachedPollLimit()) {
        finish('check-limit');
        return;
      }

      scheduleNextCheck(pollingPolicy.getUnknownRetryDelay(unknownRetryCount));
      unknownRetryCount += 1;
      return;
    }

    unknownRetryCount = 0;
    const knownStatuses = statuses.flatMap(status => {
      if (maybe.isNothing(status)) {
        return [];
      }

      return [status.value];
    });
    onStatusSnapshot(knownStatuses);
    if (!canContinue()) {
      return;
    }

    if (
      knownStatuses.every(status => {
        return status === JobsTaskStatus.Finished;
      })
    ) {
      finish('all-finished');
      return;
    }

    const hasPendingJob = knownStatuses.some(status => {
      return (
        status !== JobsTaskStatus.Finished && status !== JobsTaskStatus.Error && status !== JobsTaskStatus.Interrupted
      );
    });
    if (hasPendingJob) {
      if (hasReachedPollLimit()) {
        finish('check-limit');
        return;
      }

      scheduleNextCheck(pollingPolicy.pollIntervalMs);
      return;
    }

    const hasFinishedJob = knownStatuses.some(status => {
      return status === JobsTaskStatus.Finished;
    });
    finish(hasFinishedJob ? 'mixed-terminal' : 'all-failed');
  };

  void checkStatuses();
  return cancel;
};
