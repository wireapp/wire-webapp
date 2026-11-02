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

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {waitFor} from '@testing-library/react';
import {JobsTaskStatus, RestActionStatus, type RestPerformActionResponse} from 'cells-sdk-ts';
import {noop} from 'noop-esm';
import {Maybe} from 'true-myth';

import {
  checkCellsBackgroundActionJobs,
  getCellsBackgroundActionEvidence,
  observeCellsBackgroundActionJobs,
} from './cellsBackgroundActionJobs';

const createCheckOptions = (): Parameters<typeof checkCellsBackgroundActionJobs>[0] & {
  cellsRepository: {getBackgroundActionInfo: jest.Mock; getBackgroundMoveInfo: jest.Mock};
  clock: ReturnType<typeof createDeterministicClock>;
} => {
  return {
    cellsRepository: {
      getBackgroundActionInfo: jest.fn().mockResolvedValue({Status: JobsTaskStatus.Finished}),
      getBackgroundMoveInfo: jest.fn().mockResolvedValue({Status: JobsTaskStatus.Finished}),
    },
    actionName: 'delete' as const,
    jobUuids: ['job-1'],
    clock: createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
    isCurrent: () => {
      return true;
    },
  };
};

describe('getCellsBackgroundActionEvidence', () => {
  it('collects unique IDs for the requested action without accepting unrelated or empty IDs', () => {
    const response = {
      Status: RestActionStatus.Background,
      BackgroundActions: [
        {Name: 'delete', JobUuid: 'job-1'},
        {Name: 'delete', JobUuid: 'job-1'},
        {Name: 'delete', JobUuid: ''},
        {Name: 'move', JobUuid: 'move-job', Status: JobsTaskStatus.Error},
      ],
    };

    expect(getCellsBackgroundActionEvidence(response, 'delete')).toEqual({
      jobUuids: ['job-1'],
      hasFailedJobs: false,
      hasCompleted: false,
    });
  });

  it.each([
    {description: 'no actions', actions: undefined, completed: true, failed: false},
    {description: 'empty actions', actions: [], completed: true, failed: false},
    {
      description: 'finished identified jobs',
      actions: [{Name: 'delete', JobUuid: 'job', Status: JobsTaskStatus.Finished}],
      completed: true,
      failed: false,
    },
    {
      description: 'a finished job with an empty ID',
      actions: [{Name: 'delete', JobUuid: '', Status: JobsTaskStatus.Finished}],
      completed: false,
      failed: false,
    },
    {
      description: 'an unrelated job',
      actions: [{Name: 'move', JobUuid: 'job', Status: JobsTaskStatus.Finished}],
      completed: false,
      failed: false,
    },
    {
      description: 'a missing status',
      actions: [{Name: 'delete', JobUuid: 'job'}],
      completed: false,
      failed: false,
    },
    {
      description: 'an unknown status',
      actions: [{Name: 'delete', JobUuid: 'job', Status: JobsTaskStatus.Unknown}],
      completed: false,
      failed: false,
    },
    {
      description: 'mixed finished and failed jobs',
      actions: [
        {Name: 'delete', JobUuid: 'job-1', Status: JobsTaskStatus.Finished},
        {Name: 'delete', JobUuid: 'job-2', Status: JobsTaskStatus.Error},
      ],
      completed: false,
      failed: true,
    },
    {
      description: 'an interrupted job',
      actions: [{Name: 'delete', JobUuid: 'job', Status: JobsTaskStatus.Interrupted}],
      completed: false,
      failed: true,
    },
  ])('reports completion/failure evidence for Performed with $description', ({actions, completed, failed}) => {
    const response: RestPerformActionResponse = {Status: RestActionStatus.Performed, BackgroundActions: actions};

    const evidence = getCellsBackgroundActionEvidence(response, 'delete');

    expect(evidence.hasCompleted).toBe(completed);
    expect(evidence.hasFailedJobs).toBe(failed);
  });

  it('does not infer completion from finished jobs while the response is Background', () => {
    expect(
      getCellsBackgroundActionEvidence(
        {
          Status: RestActionStatus.Background,
          BackgroundActions: [{Name: 'delete', JobUuid: 'job', Status: JobsTaskStatus.Finished}],
        },
        'delete',
      ).hasCompleted,
    ).toBe(false);
  });
});

describe('observeCellsBackgroundActionJobs', () => {
  it('reads the requested action and retries a rejected read under the caller policy', async () => {
    const options = createCheckOptions();
    options.cellsRepository.getBackgroundMoveInfo.mockRejectedValueOnce(new Error('offline'));
    const onOutcome = jest.fn();
    const getUnknownRetryDelay = jest.fn(() => {
      return 500;
    });

    const cancel = observeCellsBackgroundActionJobs({
      ...options,
      actionName: 'move',
      pollingPolicy: {
        pollIntervalMs: 1000,
        maxUnknownRetries: 1,
        getUnknownRetryDelay,
        maxPollAttempts: Maybe.nothing(),
      },
      onOutcome,
    });
    await waitFor(() => {
      expect(getUnknownRetryDelay).toHaveBeenCalledWith(0);
    });
    options.clock.advanceByMilliseconds(500);
    await waitFor(() => {
      expect(onOutcome).toHaveBeenCalledWith('all-finished');
    });
    expect(options.cellsRepository.getBackgroundMoveInfo).toHaveBeenCalledWith({jobUuid: 'job-1'});
    expect(options.cellsRepository.getBackgroundActionInfo).not.toHaveBeenCalled();
    cancel();
  });
});

describe('checkCellsBackgroundActionJobs', () => {
  it.each([
    {status: JobsTaskStatus.Finished, pending: false, failed: false},
    {status: JobsTaskStatus.Error, pending: false, failed: true},
    {status: JobsTaskStatus.Interrupted, pending: false, failed: true},
    {status: JobsTaskStatus.Running, pending: true, failed: false},
    {status: JobsTaskStatus.Unknown, pending: true, failed: false},
    {status: undefined, pending: true, failed: false},
  ])('checks $status once without scheduling retries', async ({status, pending, failed}) => {
    const options = createCheckOptions();
    options.cellsRepository.getBackgroundActionInfo.mockResolvedValue({Status: status});

    const check = checkCellsBackgroundActionJobs(options);
    const evidence = await check.result;
    options.clock.advanceByMilliseconds(30_000);

    expect(evidence).toEqual(Maybe.just({hasPendingJobs: pending, hasFailedJobs: failed}));
    expect(options.cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(1);
  });

  it('preserves failed evidence when another read rejects', async () => {
    const options = createCheckOptions();
    options.cellsRepository.getBackgroundActionInfo
      .mockResolvedValueOnce({Status: JobsTaskStatus.Error})
      .mockRejectedValueOnce(new Error('offline'));

    const {result} = checkCellsBackgroundActionJobs({...options, jobUuids: ['failed', 'unknown']});

    expect(await result).toEqual(Maybe.just({hasPendingJobs: true, hasFailedJobs: true}));
  });

  it('resolves an empty batch without reading', async () => {
    const options = createCheckOptions();

    const {result} = checkCellsBackgroundActionJobs({...options, jobUuids: []});

    expect(await result).toEqual(Maybe.just({hasPendingJobs: false, hasFailedJobs: false}));
    expect(options.cellsRepository.getBackgroundActionInfo).not.toHaveBeenCalled();
  });

  it.each(['cancel', 'scope change'])('settles without evidence on %s while a read is pending', async cancellation => {
    const options = createCheckOptions();
    let resolveRead: (value: {Status: typeof JobsTaskStatus.Finished}) => void = noop;
    options.cellsRepository.getBackgroundActionInfo.mockReturnValue(
      new Promise(resolve => {
        resolveRead = resolve;
      }),
    );
    let isCurrent = true;
    const check = checkCellsBackgroundActionJobs({
      ...options,
      isCurrent: () => {
        return isCurrent;
      },
    });

    if (cancellation === 'cancel') {
      check.cancel();
      expect(await check.result).toEqual(Maybe.nothing());
    } else {
      isCurrent = false;
    }
    resolveRead({Status: JobsTaskStatus.Finished});

    expect(await check.result).toEqual(Maybe.nothing());
    check.cancel();
  });
});
