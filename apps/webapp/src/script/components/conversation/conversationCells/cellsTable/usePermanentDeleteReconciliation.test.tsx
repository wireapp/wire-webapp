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

import {act, renderHook, waitFor} from '@testing-library/react';
import {JobsTaskStatus} from 'cells-sdk-ts';
import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import type {CellsRepository} from 'Repositories/cells/cellsRepository';

import {
  usePermanentDeleteReconciliation,
  type UsePermanentDeleteReconciliationOptions,
} from './usePermanentDeleteReconciliation';

interface ReconciliationTestSetup {
  readonly cellsRepository: CellsRepository;
  readonly deleteNodes: jest.Mock;
  readonly getBackgroundActionInfo: jest.Mock;
  readonly clock: ReturnType<typeof createDeterministicClock>;
  readonly onRefresh: jest.Mock;
  readonly onRefreshAndReportSuccess: jest.Mock;
  readonly onDeleteCompleted: jest.Mock;
  readonly onReconciliationCompleted: jest.Mock;
  readonly reportError: jest.Mock;
  readonly options: UsePermanentDeleteReconciliationOptions;
}

const createOptions = (): ReconciliationTestSetup => {
  const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
  const deleteNodes = jest.fn().mockResolvedValue({
    Status: 'Background',
    BackgroundActions: [{Name: 'delete', JobUuid: 'delete-job'}],
  });
  const getBackgroundActionInfo = jest.fn().mockResolvedValue({Status: JobsTaskStatus.Error});
  const cellsRepository = {
    deleteNodes,
    getBackgroundActionInfo,
  } as unknown as CellsRepository;
  const onRefresh = jest.fn();
  const onRefreshAndReportSuccess = jest.fn().mockResolvedValue(true);
  const onDeleteCompleted = jest.fn();
  const onReconciliationCompleted = jest.fn();
  const reportError = jest.fn();
  const options = {
    cellsRepository,
    clock,
    isCurrentScope: () => {
      return true;
    },
    visibleNodeIds: ['selected-node'],
    isNodesLoading: false,
    onRefresh,
    onRefreshAndReportSuccess,
    onDeleteCompleted,
    onReconciliationCompleted,
    reportError,
  };

  return {
    cellsRepository,
    deleteNodes,
    getBackgroundActionInfo,
    clock,
    onRefresh,
    onRefreshAndReportSuccess,
    onDeleteCompleted,
    onReconciliationCompleted,
    reportError,
    options,
  };
};

describe('usePermanentDeleteReconciliation', () => {
  it('refreshes once after a directly completed delete and clears the captured selection', async () => {
    const {deleteNodes, onRefresh, onDeleteCompleted, options} = createOptions();
    deleteNodes.mockResolvedValue({
      Status: 'Performed',
      BackgroundActions: [{Name: 'delete', JobUuid: 'delete-job', Status: JobsTaskStatus.Finished}],
    });
    const {result} = renderHook(() => {
      return usePermanentDeleteReconciliation(options);
    });

    await act(async () => {
      await result.current.deletePermanently(['selected-node'], 'bin-scope', '/recycle_bin');
    });

    expect(deleteNodes).toHaveBeenCalledWith({uuids: ['selected-node'], permanently: true});
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onDeleteCompleted).toHaveBeenCalledWith(['selected-node']);
    expect(result.current.isUnresolved).toBe(false);
  });

  it('ignores a delete response that resolves after the hook unmounts', async () => {
    const {deleteNodes, onRefresh, onDeleteCompleted, onRefreshAndReportSuccess, options} = createOptions();
    let resolveDelete: ((response: {Status: 'Performed'; BackgroundActions: []}) => void) | undefined;
    deleteNodes.mockImplementation(() => {
      return new Promise(resolve => {
        resolveDelete = resolve as (response: {Status: 'Performed'; BackgroundActions: []}) => void;
      });
    });
    const {result, unmount} = renderHook(() => {
      return usePermanentDeleteReconciliation(options);
    });

    let deleteRequest: Promise<void> | undefined;
    act(() => {
      deleteRequest = result.current.deletePermanently(['selected-node'], 'bin-scope', '/recycle_bin');
    });
    unmount();

    await act(async () => {
      resolveDelete?.({Status: 'Performed', BackgroundActions: []});
      await deleteRequest;
    });

    expect(onDeleteCompleted).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
    expect(onRefreshAndReportSuccess).not.toHaveBeenCalled();
  });

  it('times out a pending status read and ignores its late result', async () => {
    const {clock, deleteNodes, getBackgroundActionInfo, onRefreshAndReportSuccess, options} = createOptions();
    let resolveStatus: ((response: {Status: JobsTaskStatus}) => void) | undefined;
    getBackgroundActionInfo.mockImplementation(() => {
      return new Promise(resolve => {
        resolveStatus = resolve as (response: {Status: JobsTaskStatus}) => void;
      });
    });
    const {result} = renderHook(() => {
      return usePermanentDeleteReconciliation(options);
    });

    await act(async () => {
      await result.current.deletePermanently(['selected-node'], 'bin-scope', '/recycle_bin');
    });
    await waitFor(() => {
      expect(getBackgroundActionInfo).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      clock.advanceByMilliseconds(19_999);
      await Promise.resolve();
    });
    expect(result.current.isReconciling).toBe(true);

    await act(async () => {
      clock.advanceByMilliseconds(1);
      await Promise.resolve();
    });
    expect(result.current.isReconciling).toBe(false);
    expect(result.current.reviewReason).toBe('timed-out');
    expect(onRefreshAndReportSuccess).not.toHaveBeenCalled();

    await act(async () => {
      resolveStatus?.({Status: JobsTaskStatus.Finished});
      await Promise.resolve();
    });

    expect(onRefreshAndReportSuccess).not.toHaveBeenCalled();
    expect(result.current.reviewReason).toBe('timed-out');
    expect(deleteNodes).toHaveBeenCalledTimes(1);
  });

  it('keeps known job failure evidence through the single 20-second deadline', async () => {
    const {clock, onRefreshAndReportSuccess, options} = createOptions();
    const {result} = renderHook(() => {
      return usePermanentDeleteReconciliation(options);
    });

    await act(async () => {
      await result.current.deletePermanently(['selected-node'], 'bin-scope', '/recycle_bin');
    });
    await waitFor(() => {
      expect(onRefreshAndReportSuccess).toHaveBeenCalledTimes(1);
    });
    expect(result.current.reviewReason).toBe('job-failed');

    for (let second = 1; second < 20; second += 1) {
      await act(async () => {
        clock.advanceByMilliseconds(1000);
        await waitFor(() => {
          expect(onRefreshAndReportSuccess).toHaveBeenCalledTimes(second + 1);
        });
      });
    }

    expect(onRefreshAndReportSuccess).toHaveBeenCalledTimes(20);
    expect(result.current.isReconciling).toBe(true);
    expect(result.current.reviewReason).toBe('job-failed');

    await act(async () => {
      clock.advanceByMilliseconds(999);
      await Promise.resolve();
    });
    expect(result.current.isReconciling).toBe(true);

    await act(async () => {
      clock.advanceByMilliseconds(1);
      await Promise.resolve();
    });

    expect(result.current.isReconciling).toBe(false);
    expect(result.current.reviewReason).toBe('job-failed');
    const refreshCountAtDeadline = onRefreshAndReportSuccess.mock.calls.length;
    await act(async () => {
      clock.advanceByMilliseconds(10_000);
      await Promise.resolve();
    });
    expect(onRefreshAndReportSuccess).toHaveBeenCalledTimes(refreshCountAtDeadline);
  });

  it('keeps refresh failure evidence through the deadline', async () => {
    const {clock, onRefreshAndReportSuccess, options} = createOptions();
    onRefreshAndReportSuccess.mockResolvedValue(false);
    const {result} = renderHook(() => {
      return usePermanentDeleteReconciliation(options);
    });

    await act(async () => {
      await result.current.deletePermanently(['selected-node'], 'bin-scope', '/recycle_bin');
      await waitFor(() => {
        expect(onRefreshAndReportSuccess).toHaveBeenCalledTimes(1);
      });
    });

    for (let second = 1; second < 20; second += 1) {
      await act(async () => {
        clock.advanceByMilliseconds(1000);
        await waitFor(() => {
          expect(onRefreshAndReportSuccess).toHaveBeenCalledTimes(second + 1);
        });
      });
    }
    expect(result.current.reviewReason).toBe('refresh-failed');

    await act(async () => {
      clock.advanceByMilliseconds(999);
      await Promise.resolve();
    });
    expect(result.current.isReconciling).toBe(true);
    await act(async () => {
      clock.advanceByMilliseconds(1);
      await Promise.resolve();
    });

    expect(result.current.isReconciling).toBe(false);
    expect(result.current.reviewReason).toBe('refresh-failed');
  });

  it('does not let a stale manual refresh rejection clear the next review deadline', async () => {
    const {clock, onRefreshAndReportSuccess, reportError, options} = createOptions();
    const pendingRefreshes: Array<{
      resolve: (wasSuccessful: boolean) => void;
      reject: (error: Error) => void;
    }> = [];
    onRefreshAndReportSuccess.mockImplementation(() => {
      return new Promise((resolve, reject) => {
        pendingRefreshes.push({resolve, reject});
      });
    });
    const {result} = renderHook(() => {
      return usePermanentDeleteReconciliation(options);
    });

    await act(async () => {
      await result.current.deletePermanently(['selected-node'], 'bin-scope', '/recycle_bin');
    });
    await waitFor(() => {
      expect(onRefreshAndReportSuccess).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      clock.advanceByMilliseconds(19_999);
      await Promise.resolve();
    });
    expect(result.current.isReconciling).toBe(true);

    await act(async () => {
      clock.advanceByMilliseconds(1);
      await Promise.resolve();
    });
    expect(result.current.isReconciling).toBe(false);

    await act(async () => {
      void result.current.refreshReview();
      await Promise.resolve();
    });
    expect(result.current.isRefreshingReview).toBe(true);
    await act(async () => {
      clock.advanceByMilliseconds(20_000);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.isRefreshingReview).toBe(false);
    });

    await act(async () => {
      void result.current.refreshReview();
      await Promise.resolve();
    });
    expect(result.current.isRefreshingReview).toBe(true);
    const staleRefreshError = new Error('expired manual refresh failed');
    await act(async () => {
      pendingRefreshes[1].reject(staleRefreshError);
      await Promise.resolve();
    });

    expect(reportError).toHaveBeenCalledWith(staleRefreshError);
    expect(result.current.isRefreshingReview).toBe(true);

    await act(async () => {
      clock.advanceByMilliseconds(19_999);
      await Promise.resolve();
    });
    expect(result.current.isRefreshingReview).toBe(true);

    await act(async () => {
      clock.advanceByMilliseconds(1);
      await Promise.resolve();
    });
    expect(result.current.isRefreshingReview).toBe(false);
  });
});
