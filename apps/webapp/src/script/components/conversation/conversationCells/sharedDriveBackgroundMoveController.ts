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

import {observeCellsBackgroundActionJobs} from './common/cellsBackgroundActionPolling/cellsBackgroundActionJobs';
import type {CellsBackgroundActionOutcome} from './common/cellsBackgroundActionPolling/cellsBackgroundActionPolling';
import {createBulkJobPollingPolicy} from './common/cellsBackgroundActionPolling/createBulkJobPollingPolicy';
import type {SharedDriveMoveStatus, SharedDriveMoveStatusKind} from './sharedDriveUploadStatusContext';

import type {CellsRepository} from '../../../repositories/cells/cellsRepository';

export interface BackgroundMoveObservation {
  readonly operationId: string;
  readonly cellsRepository: Pick<CellsRepository, 'getBackgroundMoveInfo'>;
  readonly clock: Clock;
  readonly random: () => number;
  readonly onOutcome: (outcome: CellsBackgroundActionOutcome) => void;
}

interface SharedDriveBackgroundMoveController {
  readonly register: (status: SharedDriveMoveStatus) => void;
  readonly get: (id: string) => BackgroundMoveOperation | undefined;
  readonly setJobUuids: (id: string, jobUuids: readonly string[]) => void;
  readonly start: (observation: BackgroundMoveObservation) => void;
  readonly stopAll: () => void;
}

export interface BackgroundMoveOperation {
  readonly status: SharedDriveMoveStatus;
  readonly jobUuids: readonly string[];
}

const kindForOutcome = (outcome: CellsBackgroundActionOutcome): SharedDriveMoveStatusKind => {
  switch (outcome) {
    case 'all-finished':
      return 'completed';
    case 'mixed-terminal':
      return 'partial';
    case 'all-failed':
      return 'failed';
    case 'check-limit':
    case 'status-unknown':
      return 'status-unknown';
  }
};

/** Owns move polling for as long as the app's status provider remains mounted. */
export const createSharedDriveBackgroundMoveController = (
  publishStatus: (status: SharedDriveMoveStatus) => void,
  observeJobs: typeof observeCellsBackgroundActionJobs = observeCellsBackgroundActionJobs,
): SharedDriveBackgroundMoveController => {
  const observations = new Map<string, {cancel: () => void}>();
  const operations = new Map<string, BackgroundMoveOperation>();
  const register = (status: SharedDriveMoveStatus): void => {
    operations.set(status.id, {status, jobUuids: []});
  };
  const get = (id: string): BackgroundMoveOperation | undefined => {
    return operations.get(id);
  };
  const setJobUuids = (id: string, jobUuids: readonly string[]): void => {
    const operation = operations.get(id);
    if (operation !== undefined) {
      operations.set(id, {...operation, jobUuids});
    }
  };

  const start = ({operationId, cellsRepository, clock, random, onOutcome}: BackgroundMoveObservation): void => {
    const operation = operations.get(operationId);
    if (operation === undefined || operation.jobUuids.length === 0) {
      return;
    }
    // The review callback belongs to the view that started the action and stops working once that view is gone.
    // A view that is still mounted publishes its own status with the callback again.
    const {onReview: _onReview, isReviewing: _isReviewing, ...status} = operation.status;
    if (observations.has(status.id)) {
      return;
    }

    const observation = {
      cancel: (): void => {
        return undefined;
      },
    };
    observations.set(status.id, observation);
    observation.cancel = observeJobs({
      actionName: 'move',
      cellsRepository,
      jobUuids: operation.jobUuids,
      clock,
      pollingPolicy: createBulkJobPollingPolicy(random),
      isCurrent: () => {
        return observations.has(status.id);
      },
      onStatusSnapshot: () => {
        if (observations.has(status.id)) {
          publishStatus(status);
        }
      },
      onOutcome: outcome => {
        if (!observations.delete(status.id)) {
          return;
        }
        publishStatus({...status, kind: kindForOutcome(outcome)});
        onOutcome(outcome);
      },
    });
  };

  const stopAll = (): void => {
    for (const observation of observations.values()) {
      observation.cancel();
    }
    observations.clear();
    operations.clear();
  };

  return {register, get, setJobUuids, start, stopAll};
};
