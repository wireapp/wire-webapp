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
 */

import {act, renderHook, waitFor} from '@testing-library/react';
import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import type {QualifiedId} from '@wireapp/api-client/lib/user/';
import {JobsTaskStatus, RestActionStatus, TreeNodeType} from 'cells-sdk-ts';
import type {ReactNode} from 'react';
import {StrictMode} from 'react';

import type {CellsRepository} from 'Repositories/cells/cellsRepository';

import {createCellsBinOperationController, type CellsBinOperationController} from './cellsBinOperationController';
import {CellsBinOperationsProvider} from './cellsBinOperationsContext';
import {useCellsBinOperationView} from './useCellsBinOperationView';

const drive: QualifiedId = {id: 'drive-id', domain: 'example.com'};
const otherDrive: QualifiedId = {id: 'other-drive-id', domain: 'example.com'};
const path = '/recycle_bin';

const createSetup = (): {
  readonly clock: ReturnType<typeof createDeterministicClock>;
  readonly controller: CellsBinOperationController;
  readonly repository: {
    readonly deleteNodes: jest.Mock;
    readonly lookupNodeByPath: jest.Mock;
    readonly getBackgroundActionInfo: jest.Mock;
    readonly getBackgroundMoveInfo: jest.Mock;
    readonly getNode: jest.Mock;
    readonly getAllNodes: jest.Mock;
  };
} => {
  const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
  const repository = {
    deleteNodes: jest.fn().mockResolvedValue({Status: RestActionStatus.Performed, BackgroundActions: []}),
    lookupNodeByPath: jest.fn().mockResolvedValue({Uuid: 'bin-root', Type: TreeNodeType.Collection}),
    getBackgroundActionInfo: jest.fn(),
    getBackgroundMoveInfo: jest.fn(),
    getNode: jest.fn().mockResolvedValue({IsRecycled: true}),
    getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
  };
  const controller = createCellsBinOperationController({
    cellsRepository: repository as unknown as CellsRepository,
    clock,
  });
  return {clock, controller, repository};
};

const startMove = (controller: CellsBinOperationController): void => {
  expect(controller.start({kind: 'move-to-bin', drive, path, targetIds: ['node-1']})).toBe(true);
};

const createOptions = (
  clock: ReturnType<typeof createDeterministicClock>,
  options: Partial<Parameters<typeof useCellsBinOperationView>[0]> = {},
): Parameters<typeof useCellsBinOperationView>[0] => {
  return {
    drive,
    path,
    clock,
    onRefresh: jest.fn().mockResolvedValue(true),
    isCurrentScope: () => {
      return true;
    },
    visibleNodeIds: [],
    isNodesLoading: false,
    ...options,
  };
};

const createWrapper = (controller: CellsBinOperationController, strict = false) => {
  return ({children}: {readonly children: ReactNode}): ReactNode => {
    const content = <CellsBinOperationsProvider value={controller}>{children}</CellsBinOperationsProvider>;
    return strict ? <StrictMode>{content}</StrictMode> : content;
  };
};

describe('useCellsBinOperationView', () => {
  it('refreshes once after a direct completion and acknowledges the captured operation', async () => {
    const {clock, controller, repository} = createSetup();
    expect(controller.start({kind: 'permanent-delete', drive, path, targetIds: ['node-1']})).toBe(true);
    const onRefresh = jest.fn().mockResolvedValue(true);
    const onAcknowledged = jest.fn();
    const {result} = renderHook(
      () => {
        return useCellsBinOperationView(createOptions(clock, {onRefresh, onAcknowledged}));
      },
      {wrapper: createWrapper(controller)},
    );

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalledTimes(1);
      expect(controller.getSnapshot(drive)?.isLocked).toBe(false);
    });

    expect(repository.deleteNodes).toHaveBeenCalledTimes(1);
    expect(onAcknowledged).toHaveBeenCalledWith(
      expect.objectContaining({kind: 'permanent-delete', targetIds: ['node-1']}),
    );
    expect(result.current.operation?.state).toBe('completed');
    controller.dispose();
  });

  it('refreshes a known running job once and refreshes again after it finishes', async () => {
    const {clock, controller, repository} = createSetup();
    repository.deleteNodes.mockResolvedValue({
      Status: RestActionStatus.Background,
      BackgroundActions: [{Name: 'delete', JobUuid: 'job-1'}],
    });
    repository.getBackgroundActionInfo
      .mockResolvedValueOnce({Status: JobsTaskStatus.Running})
      .mockResolvedValue({Status: JobsTaskStatus.Finished});
    expect(controller.start({kind: 'permanent-delete', drive, path, targetIds: ['node-1']})).toBe(true);
    const onRefresh = jest.fn().mockResolvedValue(true);
    renderHook(
      () => {
        return useCellsBinOperationView(createOptions(clock, {onRefresh}));
      },
      {wrapper: createWrapper(controller)},
    );

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalledTimes(1);
      expect(repository.getBackgroundActionInfo).toHaveBeenCalledTimes(1);
      expect(controller.getSnapshot(drive)).toMatchObject({state: 'processing', jobUuids: ['job-1']});
    });
    await act(async () => {
      clock.advanceByMilliseconds(1000);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalledTimes(2);
      expect(repository.getBackgroundActionInfo).toHaveBeenCalledTimes(2);
      expect(controller.getSnapshot(drive)?.isLocked).toBe(false);
    });
    await act(async () => {
      clock.advanceByMilliseconds(5000);
      await Promise.resolve();
    });

    expect(onRefresh).toHaveBeenCalledTimes(2);
    expect(repository.getBackgroundActionInfo).toHaveBeenCalledTimes(2);
    controller.dispose();
  });

  it('ignores a refresh result after the drive scope changes', async () => {
    const {clock, controller} = createSetup();
    startMove(controller);
    let currentDrive = drive;
    let resolveRefresh: ((successful: boolean) => void) | undefined;
    const onRefresh = jest.fn(() => {
      return new Promise<boolean>(resolve => {
        resolveRefresh = resolve;
      });
    });
    const acknowledgeRefresh = jest.spyOn(controller, 'acknowledgeRefresh');
    const initialOptions = createOptions(clock, {
      onRefresh,
      isCurrentScope: () => {
        return currentDrive === drive;
      },
    });
    const {rerender} = renderHook(
      options => {
        return useCellsBinOperationView(options);
      },
      {initialProps: initialOptions, wrapper: createWrapper(controller)},
    );

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
    currentDrive = otherDrive;
    rerender({...initialOptions, drive: otherDrive});
    await act(async () => {
      resolveRefresh?.(true);
      await Promise.resolve();
    });

    expect(controller.getSnapshot(drive)?.isLocked).toBe(true);
    expect(acknowledgeRefresh).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('does not refresh a prior drive after manual recheck resolves across a scope change', async () => {
    const {clock, controller, repository} = createSetup();
    repository.deleteNodes.mockRejectedValue(new Error('connection lost'));
    let resolveNode: ((node: {IsRecycled: boolean}) => void) | undefined;
    repository.getNode.mockImplementation(() => {
      return new Promise(resolve => {
        resolveNode = resolve;
      });
    });
    startMove(controller);
    await waitFor(() => {
      expect(controller.getSnapshot(drive)?.reason).toBe('request-failed');
    });

    let currentDrive = drive;
    const onRefresh = jest.fn().mockResolvedValue(true);
    const initialOptions = createOptions(clock, {
      onRefresh,
      isCurrentScope: () => {
        return currentDrive === drive;
      },
    });
    const {result, rerender} = renderHook(
      options => {
        return useCellsBinOperationView(options);
      },
      {initialProps: initialOptions, wrapper: createWrapper(controller)},
    );
    await waitFor(() => {
      expect(repository.getNode).toHaveBeenCalledTimes(1);
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    let manualReview: Promise<void>;
    act(() => {
      manualReview = result.current.refreshReview();
    });
    currentDrive = otherDrive;
    rerender({...initialOptions, drive: otherDrive});
    await act(async () => {
      resolveNode?.({IsRecycled: false});
      await manualReview;
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot(drive)?.isLocked).toBe(true);
    controller.dispose();
  });

  it('waits for current node visibility before acknowledging a completed delete', async () => {
    const {clock, controller, repository} = createSetup();
    repository.deleteNodes.mockResolvedValue({
      Status: RestActionStatus.Background,
      BackgroundActions: [{Name: 'delete', JobUuid: 'job-1'}],
    });
    repository.getBackgroundActionInfo.mockResolvedValue({Status: JobsTaskStatus.Error});
    expect(controller.start({kind: 'permanent-delete', drive, path, targetIds: ['node-1']})).toBe(true);
    const onAcknowledged = jest.fn();
    const initialOptions = createOptions(clock, {
      visibleNodeIds: ['node-1'],
      isNodesLoading: true,
      onAcknowledged,
    });
    const {result, rerender} = renderHook(
      options => {
        return useCellsBinOperationView(options);
      },
      {initialProps: initialOptions, wrapper: createWrapper(controller)},
    );

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
      expect(controller.getSnapshot(drive)?.state).toBe('needs-review');
    });
    expect(controller.getSnapshot(drive)?.isLocked).toBe(true);

    rerender({...initialOptions, isNodesLoading: false});
    expect(controller.getSnapshot(drive)?.isLocked).toBe(true);
    rerender({...initialOptions, isNodesLoading: false, visibleNodeIds: []});

    await waitFor(() => {
      expect(controller.getSnapshot(drive)?.isLocked).toBe(false);
    });
    expect(onAcknowledged).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('keeps the next manual refresh deadline when an older refresh rejects late', async () => {
    const {clock, controller} = createSetup();
    startMove(controller);
    const pendingRefreshes: Array<{
      readonly resolve: (successful: boolean) => void;
      readonly reject: (error: Error) => void;
    }> = [];
    const onRefresh = jest.fn(() => {
      return new Promise<boolean>((resolve, reject) => {
        pendingRefreshes.push({resolve, reject});
      });
    });
    const onAcknowledged = jest.fn();
    const {result} = renderHook(
      () => {
        return useCellsBinOperationView(createOptions(clock, {onRefresh, onAcknowledged}));
      },
      {wrapper: createWrapper(controller)},
    );
    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      clock.advanceByMilliseconds(20_000);
      await Promise.resolve();
    });
    expect(result.current.refreshTimedOut).toBe(true);
    expect(result.current.isRefreshing).toBe(false);

    let manualReview: Promise<void>;
    act(() => {
      manualReview = result.current.refreshReview();
    });
    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalledTimes(2);
    });
    await act(async () => {
      pendingRefreshes[0].reject(new Error('older refresh failed'));
      await Promise.resolve();
    });
    expect(result.current.isRefreshing).toBe(true);

    await act(async () => {
      clock.advanceByMilliseconds(19_999);
      await Promise.resolve();
    });
    expect(result.current.isRefreshing).toBe(true);
    await act(async () => {
      clock.advanceByMilliseconds(1);
      await Promise.resolve();
    });
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.refreshTimedOut).toBe(true);

    await act(async () => {
      pendingRefreshes[1].resolve(true);
      await manualReview;
    });
    expect(controller.getSnapshot(drive)?.isLocked).toBe(true);
    expect(onAcknowledged).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('keeps a failed refresh visible when the operation refresh deadline expires', async () => {
    const {clock, controller, repository} = createSetup();
    repository.deleteNodes.mockResolvedValue({
      Status: RestActionStatus.Background,
      BackgroundActions: [{Name: 'delete', JobUuid: 'job-1'}],
    });
    repository.getBackgroundActionInfo.mockResolvedValue({Status: JobsTaskStatus.Error});
    expect(controller.start({kind: 'permanent-delete', drive, path, targetIds: ['node-1']})).toBe(true);
    await waitFor(() => {
      expect(controller.getSnapshot(drive)?.reason).toBe('job-failed');
    });
    const onRefresh = jest.fn().mockResolvedValue(false);
    const {result} = renderHook(
      () => {
        return useCellsBinOperationView(createOptions(clock, {onRefresh}));
      },
      {wrapper: createWrapper(controller)},
    );
    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      clock.advanceByMilliseconds(20_000);
      await Promise.resolve();
    });

    expect(result.current.refreshFailed).toBe(true);
    expect(controller.getSnapshot(drive)).toMatchObject({
      state: 'needs-review',
      reason: 'job-failed',
      needsRefresh: false,
      isLocked: true,
    });
    const callCountAtDeadline = onRefresh.mock.calls.length;
    await act(async () => {
      clock.advanceByMilliseconds(10_000);
      await Promise.resolve();
    });
    expect(onRefresh).toHaveBeenCalledTimes(callCountAtDeadline);
    expect(result.current.refreshFailed).toBe(true);
    controller.dispose();
  });

  it('clears the refresh timeout when the view unmounts', async () => {
    const {clock, controller} = createSetup();
    startMove(controller);
    let resolveRefresh: ((successful: boolean) => void) | undefined;
    const onRefresh = jest.fn(() => {
      return new Promise<boolean>(resolve => {
        resolveRefresh = resolve;
      });
    });
    const onAcknowledged = jest.fn();
    const setTimeout = jest.spyOn(clock, 'setTimeout');
    const clearTimeout = jest.spyOn(clock, 'clearTimeout');
    const {unmount} = renderHook(
      () => {
        return useCellsBinOperationView(createOptions(clock, {onRefresh, onAcknowledged}));
      },
      {wrapper: createWrapper(controller)},
    );

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
    const refreshTimeout = setTimeout.mock.results.at(-1)?.value;
    expect(refreshTimeout).toBeDefined();
    unmount();

    expect(clearTimeout).toHaveBeenCalledWith(refreshTimeout);
    await act(async () => {
      clock.advanceByMilliseconds(20_000);
      resolveRefresh?.(true);
      await Promise.resolve();
    });
    expect(controller.getSnapshot(drive)?.isLocked).toBe(true);
    expect(onAcknowledged).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('reattaches the provider online listener under StrictMode', async () => {
    const {clock, controller} = createSetup();
    const recheckAll = jest.spyOn(controller, 'recheckAll');
    renderHook(
      () => {
        return useCellsBinOperationView(createOptions(clock));
      },
      {wrapper: createWrapper(controller, true)},
    );

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(recheckAll).toHaveBeenCalledTimes(1);
    });
    controller.dispose();
  });
});
