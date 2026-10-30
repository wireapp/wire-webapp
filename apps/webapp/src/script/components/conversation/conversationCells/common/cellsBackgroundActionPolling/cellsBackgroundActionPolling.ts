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

export type CellsBackgroundActionOutcome =
  'all-finished' | 'mixed-terminal' | 'all-failed' | 'status-unknown' | 'check-limit';

export interface CellsBackgroundActionPollingPolicy {
  readonly pollIntervalMs: number;
  readonly maxUnknownRetries: number;
  readonly getUnknownRetryDelay: (retryIndex: number) => number;
  readonly maxPollAttempts?: number;
}

export interface CellsBackgroundActionPollingOptions {
  readonly jobUuids: readonly string[];
  readonly readStatus: (jobUuid: string) => Promise<JobsTaskStatusValue | undefined>;
  readonly clock: Clock;
  readonly pollingPolicy: CellsBackgroundActionPollingPolicy;
  readonly isCurrent?: () => boolean;
  readonly onStatusSnapshot?: (statuses: readonly JobsTaskStatusValue[]) => void;
  readonly onOutcome: (
    outcome: CellsBackgroundActionOutcome,
    statuses: readonly (JobsTaskStatusValue | undefined)[],
  ) => void;
}

export type CancelCellsBackgroundActionPolling = () => void;

const isAlwaysCurrent = (): boolean => {
  return true;
};

export const pollCellsBackgroundActionJobs = ({
  jobUuids,
  readStatus,
  clock,
  pollingPolicy,
  isCurrent = isAlwaysCurrent,
  onStatusSnapshot,
  onOutcome,
}: CellsBackgroundActionPollingOptions): CancelCellsBackgroundActionPolling => {
  const uniqueJobUuids = [...new Set(jobUuids)];
  if (uniqueJobUuids.length === 0) {
    return noop;
  }

  let isActive = true;
  let timeout: ReturnType<typeof clock.setTimeout> | undefined;
  let unknownRetryCount = 0;
  let pollAttemptCount = 0;

  const clearScheduledCheck = (): void => {
    if (timeout !== undefined) {
      clock.clearTimeout(timeout);
      timeout = undefined;
    }
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

  const finish = (
    outcome: CellsBackgroundActionOutcome,
    statuses: readonly (JobsTaskStatusValue | undefined)[],
  ): void => {
    if (!canContinue()) {
      return;
    }

    isActive = false;
    clearScheduledCheck();
    onOutcome(outcome, statuses);
  };

  const scheduleNextCheck = (delay: number): void => {
    if (!canContinue()) {
      return;
    }

    timeout = clock.setTimeout(() => {
      timeout = undefined;
      void checkStatuses();
    }, delay);
  };

  const checkStatuses = async (): Promise<void> => {
    if (!canContinue()) {
      return;
    }

    pollAttemptCount += 1;
    const statuses = await Promise.all(
      uniqueJobUuids.map(async jobUuid => {
        try {
          return await readStatus(jobUuid);
        } catch {
          return undefined;
        }
      }),
    );
    if (!canContinue()) {
      return;
    }

    const hasUnknownStatus = statuses.some(status => {
      return status === undefined || status === JobsTaskStatus.Unknown;
    });
    if (hasUnknownStatus) {
      if (unknownRetryCount >= pollingPolicy.maxUnknownRetries) {
        finish('status-unknown', statuses);
        return;
      }

      if (pollingPolicy.maxPollAttempts !== undefined && pollAttemptCount >= pollingPolicy.maxPollAttempts) {
        finish('check-limit', statuses);
        return;
      }

      scheduleNextCheck(pollingPolicy.getUnknownRetryDelay(unknownRetryCount));
      unknownRetryCount += 1;
      return;
    }

    unknownRetryCount = 0;
    const knownStatuses = statuses as JobsTaskStatusValue[];
    onStatusSnapshot?.(knownStatuses);
    if (!canContinue()) {
      return;
    }

    if (
      knownStatuses.every(status => {
        return status === JobsTaskStatus.Finished;
      })
    ) {
      finish('all-finished', knownStatuses);
      return;
    }

    const hasPendingJob = knownStatuses.some(status => {
      return (
        status !== JobsTaskStatus.Finished && status !== JobsTaskStatus.Error && status !== JobsTaskStatus.Interrupted
      );
    });
    if (hasPendingJob) {
      if (pollingPolicy.maxPollAttempts !== undefined && pollAttemptCount >= pollingPolicy.maxPollAttempts) {
        finish('check-limit', knownStatuses);
        return;
      }

      scheduleNextCheck(pollingPolicy.pollIntervalMs);
      return;
    }

    const hasFinishedJob = knownStatuses.some(status => {
      return status === JobsTaskStatus.Finished;
    });
    finish(hasFinishedJob ? 'mixed-terminal' : 'all-failed', knownStatuses);
  };

  void checkStatuses();
  return cancel;
};
