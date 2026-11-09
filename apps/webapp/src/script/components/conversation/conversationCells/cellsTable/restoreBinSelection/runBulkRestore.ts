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

import {RestActionStatus, type RestPerformActionResponse} from 'cells-sdk-ts';

import type {RestoreTarget} from './resolveRestoreTargets';

import {getCellsBackgroundActionEvidence} from '../../common/cellsBackgroundActionPolling/cellsBackgroundActionJobs';
import type {CellsBackgroundActionOutcome} from '../../common/cellsBackgroundActionPolling/cellsBackgroundActionPolling';

export type BulkRestoreOutcome = 'completed' | 'request-failed' | 'partial' | 'failed' | 'status-unknown';

export interface BulkRestoreDependencies {
  lookupRootParentId: (rootParentName: string) => Promise<string>;
  restoreNodes: (params: {uuids: readonly string[]}) => Promise<RestPerformActionResponse>;
  observeJobs: (jobUuids: readonly string[]) => Promise<CellsBackgroundActionOutcome>;
  reportError: (error: unknown) => void;
}

interface RunBulkRestoreParams extends BulkRestoreDependencies {
  targets: readonly RestoreTarget[];
}

const outcomeByJobOutcome: Readonly<Record<CellsBackgroundActionOutcome, BulkRestoreOutcome>> = {
  'all-finished': 'completed',
  'mixed-terminal': 'partial',
  'all-failed': 'failed',
  'status-unknown': 'status-unknown',
  'check-limit': 'status-unknown',
};

const resolveTargetIds = async (
  targets: readonly RestoreTarget[],
  lookupRootParentId: BulkRestoreDependencies['lookupRootParentId'],
): Promise<string[]> => {
  const ids = await Promise.all(
    targets.map(target => {
      return target.kind === 'selected' ? target.node.id : lookupRootParentId(target.rootParentName);
    }),
  );
  return [...new Set(ids)];
};

/**
 * Submits the captured restore targets in a single request and waits for any background jobs.
 * The backend decides the destination and handles name conflicts; this only reports the outcome.
 */
export const runBulkRestore = async ({
  targets,
  lookupRootParentId,
  restoreNodes,
  observeJobs,
  reportError,
}: RunBulkRestoreParams): Promise<BulkRestoreOutcome> => {
  if (targets.length === 0) {
    return 'request-failed';
  }

  let response: RestPerformActionResponse;
  try {
    const uuids = await resolveTargetIds(targets, lookupRootParentId);
    response = await restoreNodes({uuids});
  } catch (error) {
    reportError(error);
    return 'request-failed';
  }

  if (response.Status === RestActionStatus.Performed) {
    return 'completed';
  }

  const {jobUuids} = getCellsBackgroundActionEvidence(response, 'restore');
  if (response.Status !== RestActionStatus.Background || jobUuids.length === 0) {
    return 'status-unknown';
  }

  return outcomeByJobOutcome[await observeJobs(jobUuids)];
};
