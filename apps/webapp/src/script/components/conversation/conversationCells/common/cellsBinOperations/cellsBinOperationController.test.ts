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

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {BackendError, BackendErrorLabel, StatusCode} from '@wireapp/api-client/lib/http/';
import type {QualifiedId} from '@wireapp/api-client/lib/user/';
import {JobsTaskStatus, RestActionStatus, TreeNodeType} from 'cells-sdk-ts';
import {act, waitFor} from '@testing-library/react';

import type {CellsRepository} from 'Repositories/cells/cellsRepository';

import {
  createCellsBinOperationController,
  type BinOperation,
  type CellsBinOperationController,
} from './cellsBinOperationController';

const drive: QualifiedId = {id: 'drive-id', domain: 'example.com'};
const otherDrive: QualifiedId = {id: 'other-drive-id', domain: 'example.com'};

const createRepository = (): {
  deleteNodes: jest.Mock;
  lookupNodeByPath: jest.Mock;
  getBackgroundActionInfo: jest.Mock;
  getBackgroundMoveInfo: jest.Mock;
  getNode: jest.Mock;
  getAllNodes: jest.Mock;
} => {
  return {
    deleteNodes: jest.fn().mockResolvedValue({Status: RestActionStatus.Performed, BackgroundActions: []}),
    lookupNodeByPath: jest.fn().mockResolvedValue({Uuid: 'bin-root', Type: TreeNodeType.Collection}),
    getBackgroundActionInfo: jest.fn().mockResolvedValue({Status: JobsTaskStatus.Finished}),
    getBackgroundMoveInfo: jest.fn(),
    getNode: jest.fn().mockResolvedValue({IsRecycled: true}),
    getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
  };
};

const createController = (): {
  cellsRepository: ReturnType<typeof createRepository>;
  clock: ReturnType<typeof createDeterministicClock>;
  controller: CellsBinOperationController;
} => {
  const cellsRepository = createRepository();
  const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
  const controller = createCellsBinOperationController({
    cellsRepository: cellsRepository as unknown as CellsRepository,
    clock,
  });
  return {cellsRepository, clock, controller};
};

const startDelete = (
  controller: CellsBinOperationController,
  kind: 'permanent-delete' | 'move-to-bin' = 'permanent-delete',
): boolean => {
  return controller.start({kind, drive, path: '/recycle_bin', targetIds: ['node-1', 'node-2']});
};

const getSnapshot = (controller: CellsBinOperationController): BinOperation | undefined => {
  return controller.getSnapshot(drive);
};

const requireSnapshot = (controller: CellsBinOperationController): BinOperation => {
  const snapshot = getSnapshot(controller);
  if (snapshot === undefined) {
    throw new Error('Expected a Bin operation snapshot.');
  }
  return snapshot;
};

describe('createCellsBinOperationController', () => {
  it('submits move-to-bin once and retains the original drive, path, and target IDs', async () => {
    const {cellsRepository, controller} = createController();
    const input = {kind: 'move-to-bin' as const, drive, path: '/files/folder', targetIds: ['node-1']};

    expect(controller.start(input)).toBe(true);
    input.targetIds.push('later-node');

    await waitFor(() => {
      expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    });
    expect(cellsRepository.deleteNodes).toHaveBeenCalledWith({uuids: ['node-1'], permanently: false});
    expect(getSnapshot(controller)).toMatchObject({
      kind: 'move-to-bin',
      isLocked: true,
      drive,
      path: '/files/folder',
      targetIds: ['node-1'],
      state: 'completed',
      needsRefresh: true,
    });
    controller.dispose();
  });

  it('continues a job after the last view detaches and exposes its result when a view returns', async () => {
    const {cellsRepository, clock, controller} = createController();
    cellsRepository.deleteNodes.mockResolvedValue({
      Status: RestActionStatus.Background,
      BackgroundActions: [{Name: 'delete', JobUuid: 'job-1'}],
    });
    cellsRepository.getBackgroundActionInfo.mockResolvedValue({Status: JobsTaskStatus.Running});
    const detachedView = jest.fn();
    const detach = controller.subscribe(detachedView);

    startDelete(controller, 'move-to-bin');
    await waitFor(() => {
      expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(1);
    });
    detach();
    detachedView.mockClear();
    cellsRepository.getBackgroundActionInfo.mockResolvedValue({Status: JobsTaskStatus.Finished});
    clock.advanceByMilliseconds(1000);
    await waitFor(() => {
      expect(getSnapshot(controller)).toMatchObject({state: 'completed', isLocked: true});
    });

    const returnedView = jest.fn();
    controller.subscribe(returnedView);
    await controller.recheck(drive);

    expect(detachedView).not.toHaveBeenCalled();
    expect(returnedView).toHaveBeenCalled();
    expect(getSnapshot(controller)).toMatchObject({state: 'completed', targetIds: ['node-1', 'node-2']});
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(2);
    controller.dispose();
  });

  it('deeply freezes a captured move summary before starting the request', async () => {
    const {controller} = createController();
    const summary = {
      items: [{id: 'node-1', name: 'Original name', isFolder: false}],
      destinationPath: '/recycle_bin',
    };

    expect(controller.start({kind: 'move-to-bin', drive, path: '/files', targetIds: ['node-1'], summary})).toBe(true);
    summary.items[0].name = 'Changed later';

    const snapshot = requireSnapshot(controller);
    expect(snapshot.summary).toEqual({
      items: [{id: 'node-1', name: 'Original name', isFolder: false}],
      destinationPath: '/recycle_bin',
    });
    expect(Object.isFrozen(snapshot.summary)).toBe(true);
    expect(Object.isFrozen(snapshot.summary?.items)).toBe(true);
    expect(Object.isFrozen(snapshot.summary?.items[0])).toBe(true);
    controller.dispose();
  });

  it('resolves and stores the original Bin root before submitting empty-bin once', async () => {
    const {cellsRepository, controller} = createController();

    expect(controller.start({kind: 'empty-bin', drive, path: '/recycle_bin', targetIds: []})).toBe(true);
    await waitFor(() => {
      expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    });

    expect(cellsRepository.lookupNodeByPath).toHaveBeenCalledWith({path: 'drive-id@example.com/recycle_bin'});
    expect(cellsRepository.deleteNodes).toHaveBeenCalledWith({uuids: ['bin-root'], permanently: true});
    expect(getSnapshot(controller)).toMatchObject({targetIds: ['bin-root'], path: '/recycle_bin', state: 'completed'});
    controller.dispose();
  });

  it('releases a lock when resolving the Bin root fails before a delete request starts', async () => {
    const {cellsRepository, controller} = createController();
    cellsRepository.lookupNodeByPath.mockResolvedValue(undefined);

    expect(controller.start({kind: 'empty-bin', drive, path: '/recycle_bin', targetIds: []})).toBe(true);
    await waitFor(() => {
      expect(getSnapshot(controller)?.state).toBe('rejected');
    });
    expect(cellsRepository.deleteNodes).not.toHaveBeenCalled();
    expect(getSnapshot(controller)).toMatchObject({needsRefresh: false, isLocked: false});
    expect(controller.start({kind: 'permanent-delete', drive, path: '/recycle_bin', targetIds: ['node-1']})).toBe(true);
    controller.dispose();
  });

  it('allows only one pending or unresolved operation per drive', async () => {
    const {controller} = createController();

    expect(startDelete(controller)).toBe(true);
    expect(controller.start({kind: 'move-to-bin', drive, path: '/files', targetIds: ['other']})).toBe(false);
    expect(controller.start({kind: 'empty-bin', drive: otherDrive, path: '/recycle_bin', targetIds: []})).toBe(true);
    controller.dispose();
  });

  it('retains known completion until a fresh view acknowledges refresh, then allows another operation', async () => {
    const {clock, controller} = createController();

    expect(startDelete(controller)).toBe(true);
    await waitFor(() => {
      expect(getSnapshot(controller)?.state).toBe('completed');
    });
    const operation = requireSnapshot(controller);
    expect(startDelete(controller)).toBe(false);

    controller.acknowledgeRefresh(drive, operation.id);

    expect(getSnapshot(controller)).toMatchObject({
      id: operation.id,
      state: 'completed',
      needsRefresh: false,
      isLocked: false,
    });
    clock.advanceByMilliseconds(20_000);
    expect(getSnapshot(controller)?.state).toBe('completed');
    expect(startDelete(controller)).toBe(true);
    controller.dispose();
  });

  it.each([
    {
      description: 'a missing job UUID in a background response',
      response: {
        Status: RestActionStatus.Background,
        BackgroundActions: [{Name: 'delete', JobUuid: 'known-job'}, {Name: 'delete'}],
      },
    },
    {
      description: 'a missing job UUID in a performed response',
      response: {
        Status: RestActionStatus.Performed,
        BackgroundActions: [{Name: 'delete', JobUuid: 'known-job'}, {Name: 'delete'}],
      },
    },
    {
      description: 'an unrecognized action with its own job UUID',
      response: {
        Status: RestActionStatus.Performed,
        BackgroundActions: [
          {Name: 'delete', JobUuid: 'known-job'},
          {Name: 'move', JobUuid: 'untracked-job'},
        ],
      },
    },
  ])('does not acknowledge the known subset as complete after $description', async ({response}) => {
    const {cellsRepository, controller} = createController();
    cellsRepository.deleteNodes.mockResolvedValue(response);
    cellsRepository.getBackgroundActionInfo.mockResolvedValue({Status: JobsTaskStatus.Finished});

    expect(startDelete(controller)).toBe(true);
    await waitFor(() => {
      expect(getSnapshot(controller)).toMatchObject({
        state: 'processing',
        reason: 'status-unknown',
        jobUuids: ['known-job'],
        needsRefresh: true,
        isLocked: true,
      });
    });

    await controller.recheck(drive);
    const operation = requireSnapshot(controller);
    controller.acknowledgeRefresh(drive, operation.id);

    expect(getSnapshot(controller)).toMatchObject({state: 'processing', isLocked: true, needsRefresh: true});
    expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(2);
    expect(cellsRepository.getBackgroundActionInfo).toHaveBeenNthCalledWith(1, {name: 'delete', jobUuid: 'known-job'});
    expect(cellsRepository.getBackgroundActionInfo).toHaveBeenNthCalledWith(2, {name: 'delete', jobUuid: 'known-job'});
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('preserves a known failure without acknowledging untrackable background actions', async () => {
    const {cellsRepository, controller} = createController();
    cellsRepository.deleteNodes.mockResolvedValue({
      Status: RestActionStatus.Background,
      BackgroundActions: [{Name: 'delete', JobUuid: 'failed-job'}, {Name: 'delete'}],
    });
    cellsRepository.getBackgroundActionInfo.mockResolvedValue({Status: JobsTaskStatus.Error});

    expect(startDelete(controller)).toBe(true);
    await waitFor(() => {
      expect(getSnapshot(controller)).toMatchObject({
        state: 'processing',
        reason: 'job-failed',
        jobUuids: ['failed-job'],
        needsRefresh: true,
        isLocked: true,
      });
    });

    const operation = requireSnapshot(controller);
    controller.acknowledgeRefresh(drive, operation.id);

    expect(getSnapshot(controller)).toMatchObject({state: 'processing', reason: 'job-failed', isLocked: true});
    expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(1);
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('times out a hung no-job recheck, retries, and ignores the first late node result', async () => {
    const {cellsRepository, clock, controller} = createController();
    cellsRepository.deleteNodes.mockRejectedValue(new Error('connection lost'));
    let resolveFirstNode: ((node: {IsRecycled: boolean}) => void) | undefined;
    cellsRepository.getNode.mockImplementationOnce(() => {
      return new Promise(resolve => {
        resolveFirstNode = resolve;
      });
    });

    expect(startDelete(controller, 'move-to-bin')).toBe(true);
    await waitFor(() => {
      expect(getSnapshot(controller)?.reason).toBe('request-failed');
    });

    let firstRecheck = Promise.resolve();
    await act(async () => {
      firstRecheck = controller.recheck(drive);
      await waitFor(() => {
        expect(cellsRepository.getNode).toHaveBeenCalledTimes(1);
      });
    });
    await act(async () => {
      clock.advanceByMilliseconds(20_000);
      await firstRecheck;
    });

    cellsRepository.getNode.mockResolvedValue({IsRecycled: false});
    await controller.recheck(drive);
    resolveFirstNode?.({IsRecycled: true});
    await Promise.resolve();

    expect(cellsRepository.getNode).toHaveBeenCalledTimes(2);
    expect(getSnapshot(controller)).toMatchObject({state: 'needs-review', reason: 'request-failed', isLocked: true});
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('stops a no-job target-read loop after disposal', async () => {
    const {cellsRepository, controller} = createController();
    cellsRepository.deleteNodes.mockRejectedValue(new Error('connection lost'));
    let resolveFirstNode: ((node: {IsRecycled: boolean}) => void) | undefined;
    cellsRepository.getNode.mockImplementationOnce(() => {
      return new Promise(resolve => {
        resolveFirstNode = resolve;
      });
    });

    expect(startDelete(controller, 'move-to-bin')).toBe(true);
    await waitFor(() => {
      expect(getSnapshot(controller)?.reason).toBe('request-failed');
    });
    const recheck = controller.recheck(drive);
    await waitFor(() => {
      expect(cellsRepository.getNode).toHaveBeenCalledTimes(1);
    });
    controller.dispose();
    resolveFirstNode?.({IsRecycled: true});
    await recheck;

    expect(cellsRepository.getNode).toHaveBeenCalledTimes(1);
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
  });

  it('uses authoritative node state to resolve a no-job move outcome without replaying the mutation', async () => {
    const {cellsRepository, controller} = createController();
    cellsRepository.deleteNodes.mockRejectedValue(new Error('connection lost'));

    expect(startDelete(controller, 'move-to-bin')).toBe(true);
    await waitFor(() => {
      expect(getSnapshot(controller)?.reason).toBe('request-failed');
    });
    await controller.recheck(drive);

    expect(cellsRepository.getNode).toHaveBeenCalledWith({uuid: 'node-1'});
    expect(getSnapshot(controller)).toMatchObject({state: 'completed', isLocked: true, needsRefresh: true});
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('does not resolve a move when any captured target is not recycled', async () => {
    const {cellsRepository, controller} = createController();
    cellsRepository.deleteNodes.mockRejectedValue(new Error('connection lost'));
    cellsRepository.getNode.mockImplementation(({uuid}: {uuid: string}) => {
      return Promise.resolve({IsRecycled: uuid === 'node-1'});
    });

    expect(startDelete(controller, 'move-to-bin')).toBe(true);
    await waitFor(() => {
      expect(getSnapshot(controller)?.reason).toBe('request-failed');
    });
    await controller.recheck(drive);

    expect(cellsRepository.getNode).toHaveBeenCalledTimes(2);
    expect(getSnapshot(controller)).toMatchObject({state: 'needs-review', reason: 'request-failed', isLocked: true});
    controller.acknowledgeRefresh(drive, requireSnapshot(controller).id);
    expect(getSnapshot(controller)?.isLocked).toBe(true);
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('does not resolve a permanent delete if any captured target is permission denied', async () => {
    const {cellsRepository, controller} = createController();
    cellsRepository.deleteNodes.mockRejectedValue(new Error('connection lost'));
    cellsRepository.getNode
      .mockRejectedValueOnce(new BackendError('missing', BackendErrorLabel.NOT_FOUND, StatusCode.NOT_FOUND))
      .mockRejectedValueOnce(new BackendError('forbidden', BackendErrorLabel.ACCESS_DENIED, StatusCode.FORBIDDEN));

    expect(startDelete(controller)).toBe(true);
    await waitFor(() => {
      expect(getSnapshot(controller)?.reason).toBe('request-failed');
    });
    await controller.recheck(drive);

    expect(cellsRepository.getNode).toHaveBeenCalledTimes(2);
    expect(getSnapshot(controller)).toMatchObject({state: 'processing', reason: 'request-failed', isLocked: true});
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('does not reconcile a different drive when one operation is rechecked', async () => {
    const {cellsRepository, controller} = createController();
    cellsRepository.deleteNodes.mockRejectedValue(new Error('connection lost'));
    cellsRepository.getNode.mockImplementation(({uuid}: {uuid: string}) => {
      return Promise.resolve({IsRecycled: uuid === 'node-1'});
    });
    controller.start({kind: 'move-to-bin', drive, path: '/files', targetIds: ['node-1']});
    controller.start({kind: 'move-to-bin', drive: otherDrive, path: '/files', targetIds: ['node-2']});
    await waitFor(() => {
      expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(2);
    });

    await controller.recheck(drive);

    expect(cellsRepository.getNode).toHaveBeenCalledTimes(1);
    expect(cellsRepository.getNode).toHaveBeenCalledWith({uuid: 'node-1'});
    expect(getSnapshot(controller)).toMatchObject({state: 'completed', isLocked: true});
    expect(controller.getSnapshot(otherDrive)).toMatchObject({
      state: 'needs-review',
      reason: 'request-failed',
      isLocked: true,
    });
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(2);
    controller.dispose();
  });

  it('uses authoritative not-found reads to resolve a permanent-delete request failure', async () => {
    const {cellsRepository, controller} = createController();
    cellsRepository.deleteNodes.mockRejectedValue(new Error('connection lost'));
    cellsRepository.getNode.mockRejectedValue(
      new BackendError('missing', BackendErrorLabel.NOT_FOUND, StatusCode.NOT_FOUND),
    );

    expect(startDelete(controller)).toBe(true);
    await waitFor(() => {
      expect(getSnapshot(controller)?.reason).toBe('request-failed');
    });
    await controller.recheck(drive);

    expect(cellsRepository.getNode).toHaveBeenCalledTimes(2);
    expect(getSnapshot(controller)).toMatchObject({state: 'completed', isLocked: true, needsRefresh: true});
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('keeps an ambiguous empty-bin request locked without treating an empty list as proof', async () => {
    const {cellsRepository, controller} = createController();
    cellsRepository.deleteNodes.mockRejectedValue(new Error('connection lost'));

    expect(controller.start({kind: 'empty-bin', drive, path: '/recycle_bin', targetIds: []})).toBe(true);
    await waitFor(() => {
      expect(getSnapshot(controller)?.reason).toBe('request-failed');
    });
    await controller.recheck(drive);

    expect(cellsRepository.getAllNodes).not.toHaveBeenCalled();
    expect(cellsRepository.getNode).not.toHaveBeenCalled();
    expect(getSnapshot(controller)).toMatchObject({state: 'needs-review', reason: 'request-failed', isLocked: true});
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('keeps an ambiguous request locked even after a plain refresh acknowledgement', async () => {
    const {cellsRepository, controller} = createController();
    cellsRepository.deleteNodes.mockRejectedValue(new Error('connection lost'));

    expect(startDelete(controller)).toBe(true);
    await waitFor(() => {
      expect(getSnapshot(controller)).toMatchObject({
        state: 'processing',
        reason: 'request-failed',
        needsRefresh: true,
        isLocked: true,
      });
    });
    const operation = requireSnapshot(controller);
    controller.acknowledgeRefresh(drive, operation.id);

    expect(getSnapshot(controller)).toMatchObject({needsRefresh: true, isLocked: true});
    expect(startDelete(controller)).toBe(false);
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('uses exponential backoff for unknown background job reads', async () => {
    const {cellsRepository, clock, controller} = createController();
    cellsRepository.deleteNodes.mockResolvedValue({
      Status: RestActionStatus.Background,
      BackgroundActions: [{Name: 'delete', JobUuid: 'job-1'}],
    });
    cellsRepository.getBackgroundActionInfo.mockResolvedValue({Status: JobsTaskStatus.Unknown});

    expect(startDelete(controller, 'move-to-bin')).toBe(true);
    await waitFor(() => {
      expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(1);
    });

    for (const [retryIndex, delay] of [1000, 2000, 4000, 8000, 16_000].entries()) {
      clock.advanceByMilliseconds(delay - 1);
      await Promise.resolve();
      expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(retryIndex + 1);
      clock.advanceByMilliseconds(1);
      await waitFor(() => {
        expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(retryIndex + 2);
      });
    }
    expect(getSnapshot(controller)?.reason).toBe('status-unknown');
    controller.dispose();
  });

  it('keeps a no-job permanent-delete outcome refreshing and locked through its deadline', async () => {
    const {clock, cellsRepository, controller} = createController();
    cellsRepository.deleteNodes.mockResolvedValue({Status: RestActionStatus.Background, BackgroundActions: []});

    expect(startDelete(controller)).toBe(true);
    await waitFor(() => {
      expect(getSnapshot(controller)).toMatchObject({
        state: 'processing',
        reason: 'status-unknown',
        needsRefresh: true,
        isLocked: true,
      });
    });

    clock.advanceByMilliseconds(20_000);
    const operation = requireSnapshot(controller);
    expect(operation).toMatchObject({state: 'needs-review', reason: 'timed-out', needsRefresh: false, isLocked: true});
    controller.acknowledgeRefresh(drive, operation.id);
    expect(getSnapshot(controller)?.isLocked).toBe(true);
    expect(startDelete(controller)).toBe(false);
    controller.dispose();
  });

  it('retains a per-job failure when another job status is unknown', async () => {
    const {cellsRepository, controller} = createController();
    cellsRepository.deleteNodes.mockResolvedValue({
      Status: RestActionStatus.Background,
      BackgroundActions: [
        {Name: 'delete', JobUuid: 'job-failed'},
        {Name: 'delete', JobUuid: 'job-unknown'},
      ],
    });
    cellsRepository.getBackgroundActionInfo.mockImplementation(({jobUuid}: {jobUuid: string}) => {
      return Promise.resolve({Status: jobUuid === 'job-failed' ? JobsTaskStatus.Error : JobsTaskStatus.Unknown});
    });

    expect(startDelete(controller)).toBe(true);
    await waitFor(() => {
      expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(2);
      expect(getSnapshot(controller)).toMatchObject({state: 'processing', reason: 'job-failed', isLocked: true});
    });
    const operation = requireSnapshot(controller);
    controller.acknowledgeRefresh(drive, operation.id);
    expect(getSnapshot(controller)?.isLocked).toBe(true);
    controller.dispose();
  });

  it('times out a hung known-job recheck, retries it, and ignores the late prior status', async () => {
    const {cellsRepository, clock, controller} = createController();
    cellsRepository.deleteNodes.mockResolvedValue({
      Status: RestActionStatus.Background,
      BackgroundActions: [{Name: 'delete', JobUuid: 'job-1'}],
    });
    cellsRepository.getBackgroundActionInfo.mockResolvedValue({Status: JobsTaskStatus.Running});

    expect(startDelete(controller, 'move-to-bin')).toBe(true);
    await waitFor(() => {
      expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(1);
    });
    let resolveFirstRead: ((status: {Status: JobsTaskStatus}) => void) | undefined;
    cellsRepository.getBackgroundActionInfo.mockImplementationOnce(() => {
      return new Promise(resolve => {
        resolveFirstRead = resolve;
      });
    });
    const firstRecheck = controller.recheckAll();
    await waitFor(() => {
      expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(2);
    });
    await act(async () => {
      clock.advanceByMilliseconds(20_000);
      await firstRecheck;
    });

    cellsRepository.getBackgroundActionInfo.mockResolvedValueOnce({Status: JobsTaskStatus.Finished});
    await controller.recheckAll();
    resolveFirstRead?.({Status: JobsTaskStatus.Running});
    await Promise.resolve();

    expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(3);
    expect(getSnapshot(controller)).toMatchObject({state: 'completed', isLocked: true, needsRefresh: true});
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('lets a returning view retry after a forced status read times out', async () => {
    const {cellsRepository, clock, controller} = createController();
    cellsRepository.deleteNodes.mockResolvedValue({
      Status: RestActionStatus.Background,
      BackgroundActions: [{Name: 'delete', JobUuid: 'job-1'}],
    });
    cellsRepository.getBackgroundActionInfo.mockResolvedValue({Status: JobsTaskStatus.Running});
    startDelete(controller, 'move-to-bin');
    await waitFor(() => {
      expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(1);
    });
    cellsRepository.getBackgroundActionInfo.mockReturnValueOnce(new Promise(jest.fn()));

    const pendingRead = controller.recheckAll();
    clock.advanceByMilliseconds(20_000);
    await pendingRead;
    cellsRepository.getBackgroundActionInfo.mockResolvedValue({Status: JobsTaskStatus.Finished});
    await controller.recheck(drive);

    expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(3);
    expect(getSnapshot(controller)).toMatchObject({state: 'completed', isLocked: true});
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it.each([
    [JobsTaskStatus.Finished, 'completed', undefined],
    [JobsTaskStatus.Error, 'needs-review', 'job-failed'],
  ] as const)(
    'does not re-read a terminal job after a detached view when later reads fail (%s)',
    async (status, state, reason) => {
      const {cellsRepository, controller} = createController();
      cellsRepository.deleteNodes.mockResolvedValue({
        Status: RestActionStatus.Background,
        BackgroundActions: [{Name: 'delete', JobUuid: 'job-1'}],
      });
      cellsRepository.getBackgroundActionInfo.mockResolvedValue({Status: status});

      expect(startDelete(controller, 'move-to-bin')).toBe(true);
      await waitFor(() => {
        expect(getSnapshot(controller)).toMatchObject({state, reason, isLocked: true});
      });
      expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(1);

      cellsRepository.getBackgroundActionInfo.mockRejectedValue(new Error('status endpoint unavailable'));
      await controller.recheck(drive);

      expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(1);
      expect(getSnapshot(controller)).toMatchObject({state, reason, needsRefresh: true, isLocked: true});
      controller.dispose();
    },
  );

  it('reuses timed-out terminal evidence and starts a fresh view deadline without another status read', async () => {
    const {cellsRepository, clock, controller} = createController();
    cellsRepository.deleteNodes.mockResolvedValue({
      Status: RestActionStatus.Background,
      BackgroundActions: [{Name: 'delete', JobUuid: 'job-1'}],
    });
    cellsRepository.getBackgroundActionInfo.mockResolvedValue({Status: JobsTaskStatus.Finished});

    expect(startDelete(controller)).toBe(true);
    await waitFor(() => {
      expect(getSnapshot(controller)?.state).toBe('completed');
    });
    expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(1);
    clock.advanceByMilliseconds(20_000);
    expect(getSnapshot(controller)).toMatchObject({state: 'completed', needsRefresh: false, isLocked: true});

    cellsRepository.getBackgroundActionInfo.mockRejectedValue(new Error('status endpoint unavailable'));
    await controller.recheck(drive);

    expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(1);
    expect(getSnapshot(controller)).toMatchObject({state: 'completed', needsRefresh: true, isLocked: true});
    clock.advanceByMilliseconds(19_999);
    expect(getSnapshot(controller)?.needsRefresh).toBe(true);
    clock.advanceByMilliseconds(1);
    expect(getSnapshot(controller)).toMatchObject({state: 'completed', needsRefresh: false, isLocked: true});
    controller.dispose();
  });

  it('does not re-read targets after authoritative no-job completion evidence', async () => {
    const {cellsRepository, controller} = createController();
    cellsRepository.deleteNodes.mockRejectedValue(new Error('connection lost'));

    expect(startDelete(controller, 'move-to-bin')).toBe(true);
    await waitFor(() => {
      expect(getSnapshot(controller)?.reason).toBe('request-failed');
    });
    cellsRepository.getNode.mockResolvedValue({IsRecycled: true});
    await controller.recheck(drive);
    expect(getSnapshot(controller)).toMatchObject({state: 'completed', isLocked: true});
    expect(cellsRepository.getNode).toHaveBeenCalledTimes(2);

    cellsRepository.getNode.mockRejectedValue(new Error('later read failed'));
    await controller.recheck(drive);

    expect(cellsRepository.getNode).toHaveBeenCalledTimes(2);
    expect(getSnapshot(controller)).toMatchObject({state: 'completed', needsRefresh: true, isLocked: true});
    controller.dispose();
  });

  it('retains known job-failure evidence when later status reads are unknown', async () => {
    const {cellsRepository, clock, controller} = createController();
    cellsRepository.deleteNodes.mockResolvedValue({
      Status: RestActionStatus.Background,
      BackgroundActions: [{Name: 'delete', JobUuid: 'job-1', Status: JobsTaskStatus.Error}],
    });
    cellsRepository.getBackgroundActionInfo.mockResolvedValue({Status: JobsTaskStatus.Unknown});

    expect(startDelete(controller)).toBe(true);
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await waitFor(() => {
        expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(attempt);
      });
      if (attempt < 5) {
        clock.advanceByMilliseconds(1000 * 2 ** (attempt - 1));
        await Promise.resolve();
      }
    }
    expect(getSnapshot(controller)).toMatchObject({state: 'processing', reason: 'job-failed', isLocked: true});

    clock.advanceByMilliseconds(5000);
    expect(getSnapshot(controller)).toMatchObject({state: 'needs-review', reason: 'job-failed', isLocked: true});
    controller.dispose();
  });

  it('does not duplicate reads when multiple attached views recheck an active observer', async () => {
    const {cellsRepository, controller} = createController();
    cellsRepository.deleteNodes.mockResolvedValue({
      Status: RestActionStatus.Background,
      BackgroundActions: [{Name: 'delete', JobUuid: 'job-1'}],
    });
    cellsRepository.getBackgroundActionInfo.mockResolvedValue({Status: JobsTaskStatus.Running});

    expect(startDelete(controller, 'move-to-bin')).toBe(true);
    await waitFor(() => {
      expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(1);
    });
    await Promise.all([controller.recheck(drive), controller.recheck(drive)]);

    expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('shares overlapping forced rechecks and delays poll restart after a pending read', async () => {
    const {cellsRepository, clock, controller} = createController();
    cellsRepository.deleteNodes.mockResolvedValue({
      Status: RestActionStatus.Background,
      BackgroundActions: [{Name: 'delete', JobUuid: 'job-1'}],
    });
    cellsRepository.getBackgroundActionInfo.mockResolvedValue({Status: JobsTaskStatus.Running});
    expect(startDelete(controller, 'move-to-bin')).toBe(true);
    await waitFor(() => {
      expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(1);
    });

    let resolveRecheck: ((value: {Status: typeof JobsTaskStatus.Running}) => void) | undefined;
    cellsRepository.getBackgroundActionInfo.mockImplementationOnce(() => {
      return new Promise(resolve => {
        resolveRecheck = resolve;
      });
    });
    const firstRecheck = controller.recheckAll();
    const secondRecheck = controller.recheckAll();
    await waitFor(() => {
      expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(2);
    });
    resolveRecheck?.({Status: JobsTaskStatus.Running});
    await Promise.all([firstRecheck, secondRecheck]);

    expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(2);
    clock.advanceByMilliseconds(999);
    expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(2);
    clock.advanceByMilliseconds(1);
    await waitFor(() => {
      expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(3);
    });
    controller.dispose();
  });

  it('rechecks known jobs without resubmitting and upgrades an unknown status to completed', async () => {
    const {cellsRepository, clock, controller} = createController();
    cellsRepository.deleteNodes.mockResolvedValue({
      Status: RestActionStatus.Background,
      BackgroundActions: [{Name: 'delete', JobUuid: 'job-1'}],
    });
    cellsRepository.getBackgroundActionInfo.mockResolvedValue({Status: JobsTaskStatus.Unknown});

    expect(startDelete(controller, 'move-to-bin')).toBe(true);
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      await waitFor(() => {
        expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(attempt);
      });
      if (attempt < 6) {
        clock.advanceByMilliseconds(1000 * 2 ** (attempt - 1));
        await Promise.resolve();
      }
    }
    await waitFor(() => {
      expect(getSnapshot(controller)?.reason).toBe('status-unknown');
    });
    cellsRepository.getBackgroundActionInfo.mockResolvedValue({Status: JobsTaskStatus.Finished});

    await controller.recheckAll();

    expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledWith({name: 'delete', jobUuid: 'job-1'});
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    expect(getSnapshot(controller)).toMatchObject({state: 'completed', reason: undefined, needsRefresh: true});
    controller.dispose();
  });

  it('requests fresh-view reconciliation during permanent-delete processing without releasing its lock', async () => {
    const {cellsRepository, controller} = createController();
    cellsRepository.deleteNodes.mockResolvedValue({
      Status: RestActionStatus.Background,
      BackgroundActions: [{Name: 'delete', JobUuid: 'job-1'}],
    });
    cellsRepository.getBackgroundActionInfo.mockResolvedValue({Status: JobsTaskStatus.Running});

    expect(startDelete(controller)).toBe(true);
    await waitFor(() => {
      expect(getSnapshot(controller)?.state).toBe('processing');
    });
    const operation = requireSnapshot(controller);
    expect(operation.needsRefresh).toBe(true);

    controller.acknowledgeRefresh(drive, operation.id);

    expect(getSnapshot(controller)).toMatchObject({needsRefresh: true, isLocked: true});
    expect(startDelete(controller)).toBe(false);
    controller.dispose();
  });

  it('keeps a job failure locked until refresh acknowledgement, then allows another operation', async () => {
    const {cellsRepository, controller} = createController();
    cellsRepository.deleteNodes.mockResolvedValue({
      Status: RestActionStatus.Background,
      BackgroundActions: [{Name: 'delete', JobUuid: 'job-1'}],
    });
    cellsRepository.getBackgroundActionInfo.mockResolvedValue({Status: JobsTaskStatus.Error});

    expect(startDelete(controller)).toBe(true);
    await waitFor(() => {
      expect(getSnapshot(controller)?.reason).toBe('job-failed');
    });
    const operation = requireSnapshot(controller);
    expect(startDelete(controller)).toBe(false);
    controller.acknowledgeRefresh(drive, operation.id);
    expect(getSnapshot(controller)?.isLocked).toBe(false);
    expect(startDelete(controller)).toBe(true);
    controller.dispose();
  });

  it('preserves a terminal completion through its refresh deadline', async () => {
    const {clock, controller} = createController();
    expect(startDelete(controller)).toBe(true);
    await waitFor(() => {
      expect(getSnapshot(controller)?.state).toBe('completed');
    });

    clock.advanceByMilliseconds(20_000);
    expect(getSnapshot(controller)).toMatchObject({
      state: 'completed',
      reason: undefined,
      needsRefresh: false,
      isLocked: true,
    });
    expect(startDelete(controller)).toBe(false);

    const operation = requireSnapshot(controller);
    controller.acknowledgeRefresh(drive, operation.id);
    expect(getSnapshot(controller)).toMatchObject({
      state: 'completed',
      reason: undefined,
      needsRefresh: false,
      isLocked: false,
    });
    expect(startDelete(controller)).toBe(true);
    controller.dispose();
  });

  it('applies the 20-second permanent-delete deadline and ignores late status results', async () => {
    const {cellsRepository, clock, controller} = createController();
    let resolveStatus: ((response: {Status: JobsTaskStatus}) => void) | undefined;
    cellsRepository.deleteNodes.mockResolvedValue({
      Status: RestActionStatus.Background,
      BackgroundActions: [{Name: 'delete', JobUuid: 'job-1'}],
    });
    cellsRepository.getBackgroundActionInfo.mockImplementation(() => {
      return new Promise(resolve => {
        resolveStatus = resolve;
      });
    });

    expect(startDelete(controller)).toBe(true);
    await waitFor(() => {
      expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(1);
    });
    clock.advanceByMilliseconds(19_999);
    expect(getSnapshot(controller)?.reason).toBeUndefined();
    clock.advanceByMilliseconds(1);
    expect(getSnapshot(controller)).toMatchObject({
      state: 'needs-review',
      reason: 'timed-out',
      needsRefresh: false,
      isLocked: true,
    });

    resolveStatus?.({Status: JobsTaskStatus.Finished});
    await Promise.resolve();
    expect(getSnapshot(controller)?.reason).toBe('timed-out');
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('does not submit if a subscriber disposes the owner before the request starts', () => {
    const {cellsRepository, controller} = createController();
    controller.subscribe(() => {
      controller.dispose();
    });

    startDelete(controller, 'move-to-bin');

    expect(cellsRepository.deleteNodes).not.toHaveBeenCalled();
    expect(getSnapshot(controller)).toBeUndefined();
  });

  it('stops polling and ignores late request completion after disposal', async () => {
    const {cellsRepository, controller} = createController();
    let resolveRequest:
      ((response: {Status: typeof RestActionStatus.Background; BackgroundActions: []}) => void) | undefined;
    cellsRepository.deleteNodes.mockImplementation(() => {
      return new Promise(resolve => {
        resolveRequest = resolve;
      });
    });
    const listener = jest.fn();
    controller.subscribe(listener);

    expect(startDelete(controller)).toBe(true);
    controller.dispose();
    const notificationCount = listener.mock.calls.length;
    resolveRequest?.({Status: RestActionStatus.Background, BackgroundActions: []});
    await Promise.resolve();

    expect(listener).toHaveBeenCalledTimes(notificationCount);
    expect(getSnapshot(controller)).toBeUndefined();
  });
});
