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
import {JobsTaskStatus} from 'cells-sdk-ts';
import {waitFor} from '@testing-library/react';
import {noop} from 'noop-esm';
import {Maybe, Task, task} from 'true-myth';

import {pollCellsBackgroundActionJobs, type CellsBackgroundActionPollingOptions} from './cellsBackgroundActionPolling';

const createPollingOptions = (
  clock: ReturnType<typeof createDeterministicClock>,
  overrides: Partial<CellsBackgroundActionPollingOptions> = {},
): CellsBackgroundActionPollingOptions => {
  return {
    jobUuids: ['job-1'],
    readStatus: jest.fn(() => {
      return Task.resolve(Maybe.just(JobsTaskStatus.Finished));
    }),
    clock,
    pollingPolicy: {
      pollIntervalMs: 1000,
      maxUnknownRetries: 5,
      getUnknownRetryDelay: retryIndex => {
        return 1000 * 2 ** retryIndex;
      },
      maxPollAttempts: Maybe.nothing(),
    },
    isCurrent: () => {
      return true;
    },
    onStatusSnapshot: noop,
    onOutcome: jest.fn(),
    ...overrides,
  };
};

describe('pollCellsBackgroundActionJobs', () => {
  it('does not read or report when no job IDs are provided', () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const readStatus = jest.fn();
    const onOutcome = jest.fn();

    pollCellsBackgroundActionJobs(createPollingOptions(clock, {jobUuids: [], readStatus, onOutcome}));

    expect(readStatus).not.toHaveBeenCalled();
    expect(onOutcome).not.toHaveBeenCalled();
  });

  it('deduplicates job IDs, reads them concurrently, and reports terminal snapshots', async () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    let resolveFirst: (status: Maybe<JobsTaskStatus>) => void = noop;
    let resolveSecond: (status: Maybe<JobsTaskStatus>) => void = noop;
    const readStatus = jest
      .fn()
      .mockImplementationOnce(() => {
        return task.fromPromise(
          new Promise<Maybe<JobsTaskStatus>>(resolve => {
            resolveFirst = resolve;
          }),
        );
      })
      .mockImplementationOnce(() => {
        return task.fromPromise(
          new Promise<Maybe<JobsTaskStatus>>(resolve => {
            resolveSecond = resolve;
          }),
        );
      });
    const onStatusSnapshot = jest.fn();
    const onOutcome = jest.fn();

    pollCellsBackgroundActionJobs(
      createPollingOptions(clock, {
        jobUuids: ['job-1', 'job-2', 'job-1'],
        readStatus,
        onStatusSnapshot,
        onOutcome,
      }),
    );

    expect(readStatus).toHaveBeenCalledTimes(2);
    expect(readStatus).toHaveBeenNthCalledWith(1, 'job-1');
    expect(readStatus).toHaveBeenNthCalledWith(2, 'job-2');

    resolveFirst(Maybe.just(JobsTaskStatus.Finished));
    resolveSecond(Maybe.just(JobsTaskStatus.Finished));

    await waitFor(() => {
      expect(onOutcome).toHaveBeenCalledWith('all-finished');
    });
    expect(onStatusSnapshot).toHaveBeenCalledWith([JobsTaskStatus.Finished, JobsTaskStatus.Finished]);
  });

  it('uses the normal polling interval for running jobs and completes when all finish', async () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const readStatus = jest
      .fn()
      .mockImplementationOnce(() => {
        return Task.resolve(Maybe.just(JobsTaskStatus.Running));
      })
      .mockImplementationOnce(() => {
        return Task.resolve(Maybe.just(JobsTaskStatus.Finished));
      });
    const onStatusSnapshot = jest.fn();
    const onOutcome = jest.fn();

    pollCellsBackgroundActionJobs(createPollingOptions(clock, {readStatus, onStatusSnapshot, onOutcome}));

    await waitFor(() => {
      expect(onStatusSnapshot).toHaveBeenCalledWith([JobsTaskStatus.Running]);
    });
    clock.advanceByMilliseconds(999);
    await Promise.resolve();
    expect(readStatus).toHaveBeenCalledTimes(1);

    clock.advanceByMilliseconds(1);
    await waitFor(() => {
      expect(onOutcome).toHaveBeenCalledWith('all-finished');
    });
    expect(readStatus).toHaveBeenCalledTimes(2);
  });

  it('bounds unknown/error retries using the caller-provided delay policy', async () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const readStatus = jest
      .fn()
      .mockImplementationOnce(() => {
        return Task.resolve(Maybe.nothing<JobsTaskStatus>());
      })
      .mockImplementationOnce(() => {
        return Task.reject<Maybe<JobsTaskStatus>, Error>(new Error('temporary status lookup failure'));
      })
      .mockImplementationOnce(() => {
        return Task.resolve(Maybe.just(JobsTaskStatus.Unknown));
      });
    const getUnknownRetryDelay = jest.fn(retryIndex => {
      return 300 + retryIndex * 100;
    });
    const onOutcome = jest.fn();

    pollCellsBackgroundActionJobs(
      createPollingOptions(clock, {
        readStatus,
        pollingPolicy: {
          pollIntervalMs: 1000,
          maxUnknownRetries: 2,
          getUnknownRetryDelay,
          maxPollAttempts: Maybe.nothing(),
        },
        onOutcome,
      }),
    );

    await waitFor(() => {
      expect(readStatus).toHaveBeenCalledTimes(1);
    });
    clock.advanceByMilliseconds(299);
    await Promise.resolve();
    expect(readStatus).toHaveBeenCalledTimes(1);

    clock.advanceByMilliseconds(1);
    await waitFor(() => {
      expect(readStatus).toHaveBeenCalledTimes(2);
    });
    clock.advanceByMilliseconds(399);
    await Promise.resolve();
    expect(readStatus).toHaveBeenCalledTimes(2);

    clock.advanceByMilliseconds(1);
    await waitFor(() => {
      expect(onOutcome).toHaveBeenCalledWith('status-unknown');
    });
    expect(getUnknownRetryDelay.mock.calls).toEqual([[0], [1]]);
  });

  it('resets unknown retry backoff after a known status', async () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const readStatus = jest
      .fn()
      .mockImplementationOnce(() => {
        return Task.resolve(Maybe.just(JobsTaskStatus.Unknown));
      })
      .mockImplementationOnce(() => {
        return Task.resolve(Maybe.just(JobsTaskStatus.Running));
      })
      .mockImplementationOnce(() => {
        return Task.resolve(Maybe.just(JobsTaskStatus.Unknown));
      })
      .mockImplementationOnce(() => {
        return Task.resolve(Maybe.just(JobsTaskStatus.Finished));
      });
    const getUnknownRetryDelay = jest.fn(retryIndex => {
      return 500 + retryIndex * 500;
    });
    const onOutcome = jest.fn();

    pollCellsBackgroundActionJobs(
      createPollingOptions(clock, {
        readStatus,
        pollingPolicy: {
          pollIntervalMs: 1000,
          maxUnknownRetries: 5,
          getUnknownRetryDelay,
          maxPollAttempts: Maybe.nothing(),
        },
        onOutcome,
      }),
    );

    await waitFor(() => {
      expect(readStatus).toHaveBeenCalledTimes(1);
    });
    clock.advanceByMilliseconds(500);
    await waitFor(() => {
      expect(readStatus).toHaveBeenCalledTimes(2);
    });
    clock.advanceByMilliseconds(1000);
    await waitFor(() => {
      expect(readStatus).toHaveBeenCalledTimes(3);
    });
    expect(getUnknownRetryDelay.mock.calls).toEqual([[0], [0]]);

    clock.advanceByMilliseconds(500);
    await waitFor(() => {
      expect(onOutcome).toHaveBeenCalledWith('all-finished');
    });
  });

  it.each([
    {statuses: [JobsTaskStatus.Finished, JobsTaskStatus.Error], expected: 'mixed-terminal'},
    {statuses: [JobsTaskStatus.Interrupted, JobsTaskStatus.Error], expected: 'all-failed'},
  ] as const)('classifies terminal statuses as $expected', async ({statuses, expected}) => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const readStatus = jest
      .fn()
      .mockImplementationOnce(() => {
        return Task.resolve(Maybe.just(statuses[0]));
      })
      .mockImplementationOnce(() => {
        return Task.resolve(Maybe.just(statuses[1]));
      });
    const onOutcome = jest.fn();

    pollCellsBackgroundActionJobs(createPollingOptions(clock, {jobUuids: ['job-1', 'job-2'], readStatus, onOutcome}));

    await waitFor(() => {
      expect(onOutcome).toHaveBeenCalledWith(expected);
    });
  });

  it('returns check-limit when the optional total check bound is reached', async () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const readStatus = jest.fn(() => {
      return Task.resolve(Maybe.just(JobsTaskStatus.Running));
    });
    const onOutcome = jest.fn();

    pollCellsBackgroundActionJobs(
      createPollingOptions(clock, {
        readStatus,
        pollingPolicy: {
          pollIntervalMs: 1000,
          maxUnknownRetries: 5,
          getUnknownRetryDelay: retryIndex => {
            return 1000 * 2 ** retryIndex;
          },
          maxPollAttempts: Maybe.just(1),
        },
        onOutcome,
      }),
    );

    await waitFor(() => {
      expect(onOutcome).toHaveBeenCalledWith('check-limit');
    });
    expect(readStatus).toHaveBeenCalledTimes(1);
  });

  it('ignores results when polling becomes stale during a read', async () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    let resolveStatus: (status: Maybe<JobsTaskStatus>) => void = noop;
    let isCurrent = true;
    const isCurrentGuard = jest.fn(() => {
      return isCurrent;
    });
    const readStatus = jest.fn(() => {
      return task.fromPromise(
        new Promise<Maybe<JobsTaskStatus>>(resolve => {
          resolveStatus = resolve;
        }),
      );
    });
    const onStatusSnapshot = jest.fn();
    const onOutcome = jest.fn();

    pollCellsBackgroundActionJobs(
      createPollingOptions(clock, {
        readStatus,
        isCurrent: isCurrentGuard,
        onStatusSnapshot,
        onOutcome,
      }),
    );

    isCurrent = false;
    resolveStatus(Maybe.just(JobsTaskStatus.Finished));
    await waitFor(() => {
      expect(isCurrentGuard).toHaveBeenCalledTimes(2);
    });

    expect(onStatusSnapshot).not.toHaveBeenCalled();
    expect(onOutcome).not.toHaveBeenCalled();
  });

  it('cancels scheduled polls and ignores results from in-flight reads', async () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const readStatus = jest.fn().mockImplementationOnce(() => {
      return Task.resolve(Maybe.just(JobsTaskStatus.Running));
    });
    const onStatusSnapshot = jest.fn();
    const onOutcome = jest.fn();

    const cancel = pollCellsBackgroundActionJobs(
      createPollingOptions(clock, {readStatus, onStatusSnapshot, onOutcome}),
    );

    await waitFor(() => {
      expect(onStatusSnapshot).toHaveBeenCalledWith([JobsTaskStatus.Running]);
    });
    cancel();
    clock.advanceByMilliseconds(1000);
    await Promise.resolve();
    expect(readStatus).toHaveBeenCalledTimes(1);
    expect(onOutcome).not.toHaveBeenCalled();

    let resolveLateRead: (status: Maybe<JobsTaskStatus>) => void = noop;
    const lateReadStatus = jest.fn(() => {
      return task.fromPromise(
        new Promise<Maybe<JobsTaskStatus>>(resolve => {
          resolveLateRead = resolve;
        }),
      );
    });
    const onLateSnapshot = jest.fn();
    const onLateOutcome = jest.fn();

    const cancelDuringRead = pollCellsBackgroundActionJobs(
      createPollingOptions(clock, {
        readStatus: lateReadStatus,
        onStatusSnapshot: onLateSnapshot,
        onOutcome: onLateOutcome,
      }),
    );
    expect(lateReadStatus).toHaveBeenCalledTimes(1);
    cancelDuringRead();
    resolveLateRead(Maybe.just(JobsTaskStatus.Finished));
    await Promise.resolve();
    await Promise.resolve();
    expect(onLateSnapshot).not.toHaveBeenCalled();
    expect(onLateOutcome).not.toHaveBeenCalled();
  });
});
