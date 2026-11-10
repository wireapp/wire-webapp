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
import {act, renderHook, waitFor} from '@testing-library/react';
import {JobsTaskStatus, RestActionStatus} from 'cells-sdk-ts';
import {Maybe} from 'true-myth';

import {CellNode, CellNodeType} from '../../../../../types/cellNode';

import type {RestoreTarget} from './resolveRestoreTargets';
import {useBulkRestore, type BulkRestoreState, type UseBulkRestoreOptions} from './useBulkRestore';

const conversationQualifiedId = {id: 'conversation-id', domain: 'wire.test'};

const createNode = (path: string): CellNode => {
  return {
    id: `id-${path}`,
    path: `conversation-id/recycle_bin/${path}`,
    name: path,
    sizeMb: '',
    sizeBytes: Maybe.nothing(),
    uploadedAtTimestamp: 0,
    owner: '',
    conversationName: '',
    tags: [],
    presignedUrlExpiresAt: null,
    user: null,
    selfUserDriveRole: 'editor',
    extension: '',
    type: CellNodeType.FILE,
  };
};

const selected = (path: string): RestoreTarget => {
  return {kind: 'selected', node: createNode(path)};
};

const parentOf = (rootParentName: string): RestoreTarget => {
  return {kind: 'parent', rootParentName, selectedNodes: [createNode(`${rootParentName}/child.txt`)]};
};

interface BulkRestoreTestSetup {
  readonly clock: ReturnType<typeof createDeterministicClock>;
  readonly restoreNodes: jest.Mock;
  readonly lookupNodeByPath: jest.Mock;
  readonly getBackgroundActionInfo: jest.Mock;
  readonly onRefreshAndReportSuccess: jest.Mock;
  readonly onRestoreSettled: jest.Mock;
  readonly onStatusChange: jest.Mock;
  readonly onStatusCleared: jest.Mock;
  readonly reportError: jest.Mock;
  readonly options: UseBulkRestoreOptions;
}

const createSetup = (): BulkRestoreTestSetup => {
  const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
  const restoreNodes = jest.fn().mockResolvedValue({Status: RestActionStatus.Performed});
  const lookupNodeByPath = jest.fn().mockResolvedValue({Uuid: 'parent-uuid'});
  const getBackgroundActionInfo = jest.fn().mockResolvedValue({Status: JobsTaskStatus.Finished});
  const onRefreshAndReportSuccess = jest.fn().mockResolvedValue(true);
  const onRestoreSettled = jest.fn();
  const onStatusChange = jest.fn();
  const onStatusCleared = jest.fn();
  const reportError = jest.fn();
  const options: UseBulkRestoreOptions = {
    cellsRepository: {restoreNodes, lookupNodeByPath, getBackgroundActionInfo},
    clock,
    random: () => {
      return 0.5;
    },
    conversationQualifiedId,
    isCurrentScope: () => {
      return true;
    },
    onRefreshAndReportSuccess,
    onRestoreSettled,
    onStatusChange,
    onStatusCleared,
    reportError,
  };
  return {
    clock,
    restoreNodes,
    lookupNodeByPath,
    getBackgroundActionInfo,
    onRefreshAndReportSuccess,
    onRestoreSettled,
    onStatusChange,
    onStatusCleared,
    reportError,
    options,
  };
};

describe('useBulkRestore', () => {
  it('submits the captured targets once, refreshes, and settles after a performed restore', async () => {
    const {restoreNodes, onRefreshAndReportSuccess, onRestoreSettled, options} = createSetup();
    const {result} = renderHook(() => {
      return useBulkRestore(options);
    });

    await act(async () => {
      await result.current.restore([selected('a.txt'), selected('b.txt')], 'bin-scope');
    });

    expect(restoreNodes).toHaveBeenCalledTimes(1);
    expect(restoreNodes).toHaveBeenCalledWith({uuids: ['id-a.txt', 'id-b.txt']});
    expect(onRefreshAndReportSuccess).toHaveBeenCalledTimes(1);
    expect(onRestoreSettled).toHaveBeenCalledTimes(1);
    expect(result.current.reviewReason).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it('looks up the deleted root parent in the Bin and restores it instead of the nested item', async () => {
    const {restoreNodes, lookupNodeByPath, options} = createSetup();
    const {result} = renderHook(() => {
      return useBulkRestore(options);
    });

    await act(async () => {
      await result.current.restore([parentOf('Folder')], 'bin-scope');
    });

    expect(lookupNodeByPath).toHaveBeenCalledWith({path: expect.stringContaining('recycle_bin/Folder')});
    expect(restoreNodes).toHaveBeenCalledWith({uuids: ['parent-uuid']});
  });

  it('asks for review and keeps the selection when the restore request fails', async () => {
    const {restoreNodes, onRestoreSettled, options} = createSetup();
    restoreNodes.mockRejectedValue(new Error('network'));
    const {result} = renderHook(() => {
      return useBulkRestore(options);
    });

    await act(async () => {
      await result.current.restore([selected('a.txt')], 'bin-scope');
    });

    expect(result.current.reviewReason).toBe('request-failed');
    expect(onRestoreSettled).not.toHaveBeenCalled();
  });

  it('asks for review when the restore succeeded but the refresh failed, and settles after a later refresh', async () => {
    const {onRefreshAndReportSuccess, onRestoreSettled, options} = createSetup();
    onRefreshAndReportSuccess.mockResolvedValueOnce(false);
    const {result} = renderHook(() => {
      return useBulkRestore(options);
    });

    await act(async () => {
      await result.current.restore([selected('a.txt')], 'bin-scope');
    });
    expect(result.current.reviewReason).toBe('refresh-failed');
    expect(onRestoreSettled).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.refreshReview();
    });

    expect(result.current.reviewReason).toBeNull();
    expect(onRestoreSettled).toHaveBeenCalledTimes(1);
  });

  it('keeps the review reason when the review refresh fails again', async () => {
    const {restoreNodes, onRefreshAndReportSuccess, options} = createSetup();
    restoreNodes.mockRejectedValue(new Error('network'));
    onRefreshAndReportSuccess.mockResolvedValue(false);
    const {result} = renderHook(() => {
      return useBulkRestore(options);
    });
    await act(async () => {
      await result.current.restore([selected('a.txt')], 'bin-scope');
    });

    await act(async () => {
      await result.current.refreshReview();
    });

    expect(result.current.reviewReason).toBe('request-failed');
    expect(result.current.isRefreshingReview).toBe(false);
  });

  it('waits for background restore jobs before refreshing', async () => {
    const {clock, restoreNodes, getBackgroundActionInfo, onRefreshAndReportSuccess, onRestoreSettled, options} =
      createSetup();
    getBackgroundActionInfo.mockResolvedValueOnce({Status: JobsTaskStatus.Running});
    restoreNodes.mockResolvedValue({
      Status: RestActionStatus.Background,
      BackgroundActions: [{Name: 'restore', JobUuid: 'job-1', Status: JobsTaskStatus.Running}],
    });
    const {result} = renderHook(() => {
      return useBulkRestore(options);
    });

    let restoreRequest: Promise<void> | undefined;
    await act(async () => {
      restoreRequest = result.current.restore([selected('a.txt')], 'bin-scope');
      await Promise.resolve();
    });
    expect(result.current.isPending).toBe(true);
    expect(onRefreshAndReportSuccess).not.toHaveBeenCalled();

    await act(async () => {
      for (let tick = 0; tick < 5; tick++) {
        clock.advanceByMilliseconds(1000);
        await Promise.resolve();
      }
      await restoreRequest;
    });

    expect(onRefreshAndReportSuccess).toHaveBeenCalledTimes(1);
    expect(onRestoreSettled).toHaveBeenCalledTimes(1);
  });

  it('reports processing and then completed for a performed restore', async () => {
    const {onStatusChange, options} = createSetup();
    const {result} = renderHook(() => {
      return useBulkRestore(options);
    });

    await act(async () => {
      await result.current.restore([selected('a.txt')], 'bin-scope');
    });

    expect(onStatusChange.mock.calls).toEqual([['processing'], ['completed']]);
  });

  it('reports the request-failed outcome', async () => {
    const {restoreNodes, onStatusChange, options} = createSetup();
    restoreNodes.mockRejectedValue(new Error('network'));
    const {result} = renderHook(() => {
      return useBulkRestore(options);
    });

    await act(async () => {
      await result.current.restore([selected('a.txt')], 'bin-scope');
    });

    expect(onStatusChange.mock.calls).toEqual([['processing'], ['request-failed']]);
  });

  it('reports finished-unknown when the restore succeeded but the refresh failed', async () => {
    const {onRefreshAndReportSuccess, onStatusChange, options} = createSetup();
    onRefreshAndReportSuccess.mockResolvedValue(false);
    const {result} = renderHook(() => {
      return useBulkRestore(options);
    });

    await act(async () => {
      await result.current.restore([selected('a.txt')], 'bin-scope');
    });

    expect(onStatusChange.mock.calls).toEqual([['processing'], ['finished-unknown']]);
  });

  it('clears the status once a review refresh succeeds', async () => {
    const {restoreNodes, onStatusCleared, options} = createSetup();
    restoreNodes.mockRejectedValue(new Error('network'));
    const {result} = renderHook(() => {
      return useBulkRestore(options);
    });
    await act(async () => {
      await result.current.restore([selected('a.txt')], 'bin-scope');
    });
    expect(onStatusCleared).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.refreshReview();
    });

    expect(onStatusCleared).toHaveBeenCalledTimes(1);
  });

  it('still reports the real outcome when the scope changed during the restore, without refreshing', async () => {
    const {onRefreshAndReportSuccess, onRestoreSettled, onStatusChange, options} = createSetup();
    const isCurrentScope = jest.fn().mockReturnValueOnce(true).mockReturnValue(false);
    const {result} = renderHook(() => {
      return useBulkRestore({...options, isCurrentScope});
    });

    await act(async () => {
      await result.current.restore([selected('a.txt')], 'bin-scope');
    });

    expect(onStatusChange.mock.calls).toEqual([['processing'], ['completed']]);
    expect(onRefreshAndReportSuccess).not.toHaveBeenCalled();
    expect(onRestoreSettled).not.toHaveBeenCalled();
  });

  it('reports the error behind a failed restore request instead of swallowing it', async () => {
    const error = new Error('network');
    const {restoreNodes, reportError, options} = createSetup();
    restoreNodes.mockRejectedValue(error);
    const {result} = renderHook(() => {
      return useBulkRestore(options);
    });

    await act(async () => {
      await result.current.restore([selected('a.txt')], 'bin-scope');
    });

    expect(reportError).toHaveBeenCalledWith(error);
  });

  it('stops showing the review refresh as running once its deadline passes and ignores the late result', async () => {
    const {clock, restoreNodes, onRefreshAndReportSuccess, onStatusCleared, options} = createSetup();
    restoreNodes.mockRejectedValue(new Error('network'));
    const {result} = renderHook(() => {
      return useBulkRestore(options);
    });
    await act(async () => {
      await result.current.restore([selected('a.txt')], 'bin-scope');
    });
    let resolveRefresh: (didRefresh: boolean) => void = () => {
      return undefined;
    };
    onRefreshAndReportSuccess.mockReturnValueOnce(
      new Promise<boolean>(resolve => {
        resolveRefresh = resolve;
      }),
    );

    let refreshRequest: Promise<void> | undefined;
    act(() => {
      refreshRequest = result.current.refreshReview();
    });
    expect(result.current.isRefreshingReview).toBe(true);

    await act(async () => {
      clock.advanceByMilliseconds(20_000);
      await refreshRequest;
    });
    expect(result.current.isRefreshingReview).toBe(false);
    expect(result.current.reviewReason).toBe('request-failed');

    await act(async () => {
      resolveRefresh(true);
    });
    expect(onStatusCleared).not.toHaveBeenCalled();
    expect(result.current.reviewReason).toBe('request-failed');
  });

  it('ignores a second restore while one is pending', async () => {
    const {restoreNodes, options} = createSetup();
    const {result} = renderHook(() => {
      return useBulkRestore(options);
    });

    await act(async () => {
      await Promise.all([
        result.current.restore([selected('a.txt')], 'bin-scope'),
        result.current.restore([selected('a.txt')], 'bin-scope'),
      ]);
    });

    expect(restoreNodes).toHaveBeenCalledTimes(1);
  });

  it('does not submit when the scope is no longer current', async () => {
    const {restoreNodes, options} = createSetup();
    const {result} = renderHook(() => {
      return useBulkRestore({
        ...options,
        isCurrentScope: () => {
          return false;
        },
      });
    });

    await act(async () => {
      await result.current.restore([selected('a.txt')], 'bin-scope');
    });

    expect(restoreNodes).not.toHaveBeenCalled();
  });

  it('keeps a new restore pending when an earlier scope finishes', async () => {
    const {restoreNodes, onRestoreSettled, options} = createSetup();
    const resolvers: Array<(response: {Status: RestActionStatus}) => void> = [];
    restoreNodes.mockImplementation(() => {
      return new Promise(resolve => {
        resolvers.push(resolve);
      });
    });
    let currentScope = 'A';
    const {result} = renderHook(() => {
      return useBulkRestore({
        ...options,
        isCurrentScope: scope => {
          return scope === currentScope;
        },
      });
    });

    let restoreA: Promise<void> | undefined;
    let restoreB: Promise<void> | undefined;
    act(() => {
      restoreA = result.current.restore([selected('a.txt')], 'A');
    });
    await waitFor(() => {
      return expect(resolvers).toHaveLength(1);
    });
    act(() => {
      currentScope = 'B';
      result.current.reset();
      restoreB = result.current.restore([selected('b.txt')], 'B');
    });
    await waitFor(() => {
      return expect(resolvers).toHaveLength(2);
    });

    await act(async () => {
      resolvers[0]({Status: RestActionStatus.Performed});
      await restoreA;
    });
    expect(result.current.isPending).toBe(true);
    expect(onRestoreSettled).not.toHaveBeenCalled();

    await act(async () => {
      resolvers[1]({Status: RestActionStatus.Performed});
      await restoreB;
    });
    expect(result.current.isPending).toBe(false);
    expect(onRestoreSettled).toHaveBeenCalledTimes(1);
  });

  it('does not let an earlier review refresh clear a new scope selection', async () => {
    const {restoreNodes, onRefreshAndReportSuccess, onRestoreSettled, options} = createSetup();
    restoreNodes.mockRejectedValue(new Error('network'));
    let resolveRefresh: ((success: boolean) => void) | undefined;
    const {result} = renderHook(() => {
      return useBulkRestore(options);
    });
    await act(async () => {
      await result.current.restore([selected('a.txt')], 'A');
    });
    onRefreshAndReportSuccess.mockImplementationOnce(() => {
      return new Promise(resolve => {
        resolveRefresh = resolve;
      });
    });
    let refreshA: Promise<void> | undefined;
    act(() => {
      refreshA = result.current.refreshReview();
    });
    expect(result.current.isRefreshingReview).toBe(true);
    act(() => {
      return result.current.reset();
    });
    await act(async () => {
      resolveRefresh?.(true);
      await refreshA;
    });
    expect(onRestoreSettled).not.toHaveBeenCalled();
    expect(result.current.reviewReason).toBeNull();
    expect(result.current.isRefreshingReview).toBe(false);
  });

  it('does not refresh or settle when the response arrives after unmount', async () => {
    const {restoreNodes, onRefreshAndReportSuccess, onRestoreSettled, options} = createSetup();
    let resolveRestore: ((response: {Status: string}) => void) | undefined;
    restoreNodes.mockImplementation(() => {
      return new Promise(resolve => {
        resolveRestore = resolve;
      });
    });
    const {result, unmount} = renderHook(() => {
      return useBulkRestore(options);
    });

    let restoreRequest: Promise<void> | undefined;
    act(() => {
      restoreRequest = result.current.restore([selected('a.txt')], 'bin-scope');
    });
    await waitFor(() => {
      expect(resolveRestore).toBeDefined();
    });
    unmount();
    await act(async () => {
      resolveRestore?.({Status: RestActionStatus.Performed});
      await restoreRequest;
    });

    expect(onRefreshAndReportSuccess).not.toHaveBeenCalled();
    expect(onRestoreSettled).not.toHaveBeenCalled();
  });

  describe('when background polling is cancelled before an outcome is known', () => {
    const startPollingRestore = async (): Promise<{
      readonly setup: BulkRestoreTestSetup;
      readonly view: ReturnType<typeof renderHook<BulkRestoreState, unknown>>;
      readonly restoreRequest: Promise<void>;
    }> => {
      const setup = createSetup();
      setup.getBackgroundActionInfo.mockResolvedValue({Status: JobsTaskStatus.Running});
      setup.restoreNodes.mockResolvedValue({
        Status: RestActionStatus.Background,
        BackgroundActions: [{Name: 'restore', JobUuid: 'job-1', Status: JobsTaskStatus.Running}],
      });
      const view = renderHook(() => {
        return useBulkRestore(setup.options);
      });
      let restoreRequest: Promise<void> = Promise.resolve();
      await act(async () => {
        restoreRequest = view.result.current.restore([selected('a.txt')], 'bin-scope');
        await Promise.resolve();
      });
      await waitFor(() => {
        expect(setup.getBackgroundActionInfo).toHaveBeenCalled();
      });
      return {setup, view, restoreRequest};
    };

    it('reports status-unknown and settles the restore when reset', async () => {
      const {setup, view, restoreRequest} = await startPollingRestore();
      expect(setup.onStatusChange).toHaveBeenLastCalledWith('processing');

      act(() => {
        view.result.current.reset();
      });
      await act(async () => {
        await restoreRequest;
      });

      expect(setup.onStatusChange).toHaveBeenLastCalledWith('status-unknown');
      expect(setup.onRefreshAndReportSuccess).not.toHaveBeenCalled();
      expect(view.result.current.isPending).toBe(false);
    });

    it('reports status-unknown and settles the restore when unmounted', async () => {
      const {setup, view, restoreRequest} = await startPollingRestore();

      view.unmount();
      await act(async () => {
        await restoreRequest;
      });

      expect(setup.onStatusChange).toHaveBeenLastCalledWith('status-unknown');
      expect(setup.onRefreshAndReportSuccess).not.toHaveBeenCalled();
    });
  });

  it('starts only one review refresh when requested twice before it settles', async () => {
    const {restoreNodes, onRefreshAndReportSuccess, options} = createSetup();
    restoreNodes.mockRejectedValue(new Error('network'));
    const {result} = renderHook(() => {
      return useBulkRestore(options);
    });
    await act(async () => {
      await result.current.restore([selected('a.txt')], 'bin-scope');
    });
    onRefreshAndReportSuccess.mockClear();
    onRefreshAndReportSuccess.mockReturnValue(
      new Promise<boolean>(() => {
        return undefined;
      }),
    );

    act(() => {
      void result.current.refreshReview();
      void result.current.refreshReview();
    });

    expect(onRefreshAndReportSuccess).toHaveBeenCalledTimes(1);
  });
  describe('when the view changes while the Bin refreshes after the restore', () => {
    it('still reports a completed restore whose refresh succeeded', async () => {
      const {onRefreshAndReportSuccess, onStatusChange, options} = createSetup();
      let isScopeCurrent = true;
      onRefreshAndReportSuccess.mockImplementation(() => {
        isScopeCurrent = false;
        return Promise.resolve(true);
      });
      const {result} = renderHook(() => {
        return useBulkRestore({
          ...options,
          isCurrentScope: () => {
            return isScopeCurrent;
          },
        });
      });

      await act(async () => {
        await result.current.restore([selected('a.txt')], 'bin-scope');
      });

      expect(onStatusChange).toHaveBeenLastCalledWith('completed');
    });

    it.each([
      [
        'request-failed',
        () => {
          return Promise.reject(new Error('network'));
        },
      ],
      [
        'status-unknown',
        () => {
          return Promise.resolve({Status: RestActionStatus.Background, BackgroundActions: []});
        },
      ],
    ] as const)('still reports the %s outcome instead of leaving the popup on processing', async (outcome, respond) => {
      const {restoreNodes, onRefreshAndReportSuccess, onStatusChange, options} = createSetup();
      restoreNodes.mockImplementation(respond);
      let isScopeCurrent = true;
      onRefreshAndReportSuccess.mockImplementation(() => {
        isScopeCurrent = false;
        return Promise.resolve(true);
      });
      const {result} = renderHook(() => {
        return useBulkRestore({
          ...options,
          isCurrentScope: () => {
            return isScopeCurrent;
          },
        });
      });

      await act(async () => {
        await result.current.restore([selected('a.txt')], 'bin-scope');
      });

      expect(onStatusChange).toHaveBeenLastCalledWith(outcome);
    });
  });
});
