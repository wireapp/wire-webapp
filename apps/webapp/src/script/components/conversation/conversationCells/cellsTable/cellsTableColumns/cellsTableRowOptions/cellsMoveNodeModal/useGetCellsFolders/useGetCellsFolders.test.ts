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
import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {RestNode} from 'cells-sdk-ts';
import {noop} from 'noop-esm';

import {createExecutingFireAndForgetInvokerForTest} from 'src/script/page/testSupport/rootContextTestSupport';
import {CellNode} from 'src/script/types/cellNode';

import {useGetCellsFolders} from './useGetCellsFolders';

describe('useGetCellsFolders', () => {
  const nodeToMove = {path: 'wire-cells-web/source'} as CellNode;
  const conversationQualifiedId = {id: 'conversation-id', domain: 'wire.com'};
  const folderNode = {
    Type: 'COLLECTION',
    Uuid: 'folder-id',
    Path: 'wire-cells-web/destination',
  } as RestNode;
  let cellsRepository: {getAllNodes: jest.Mock};
  let clock: ReturnType<typeof createDeterministicClock>;
  const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();

  beforeEach(() => {
    jest.clearAllMocks();
    cellsRepository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: [folderNode]}),
    };
    clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
  });

  const renderUseGetCellsFolders = (qualifiedId = conversationQualifiedId) => {
    return renderHook(
      ({conversationQualifiedId}: {conversationQualifiedId: typeof qualifiedId}) => {
        return useGetCellsFolders({
          nodeToMove,
          cellsRepository: cellsRepository as never,
          conversationQualifiedId,
          currentPath: 'wire-cells-web',
          enabled: true,
          fireAndForgetInvoker,
          clock,
        });
      },
      {initialProps: {conversationQualifiedId: qualifiedId}},
    );
  };

  it('loads destination folders and excludes the folder being moved', async () => {
    const {result} = renderUseGetCellsFolders();

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.folders).toEqual([
      {id: 'folder-id', name: 'destination', path: 'wire-cells-web/destination'},
    ]);
    expect(cellsRepository.getAllNodes).toHaveBeenCalledWith({
      path: 'conversation-id@wire.com/wire-cells-web',
      type: 'folder',
    });
  });

  it('does not refetch when the qualified ID object changes but its values do not', async () => {
    const {result, rerender} = renderUseGetCellsFolders();

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    expect(cellsRepository.getAllNodes).toHaveBeenCalledTimes(1);

    rerender({conversationQualifiedId: {...conversationQualifiedId}});

    expect(cellsRepository.getAllNodes).toHaveBeenCalledTimes(1);
  });

  it('refetches when the qualified conversation ID changes', async () => {
    const {result, rerender} = renderUseGetCellsFolders();

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    rerender({conversationQualifiedId: {id: 'another-conversation', domain: 'wire.com'}});

    await waitFor(() => {
      expect(cellsRepository.getAllNodes).toHaveBeenCalledTimes(2);
    });
    expect(cellsRepository.getAllNodes).toHaveBeenLastCalledWith({
      path: 'another-conversation@wire.com/wire-cells-web',
      type: 'folder',
    });
  });

  it('reports loading until an empty result resolves, then exposes the empty state', async () => {
    let resolveRequest: (response: {Nodes: RestNode[]}) => void = noop;
    cellsRepository.getAllNodes.mockReturnValue(
      new Promise(resolve => {
        resolveRequest = resolve;
      }),
    );
    const {result} = renderUseGetCellsFolders();

    await waitFor(() => {
      expect(result.current.status).toBe('loading');
    });
    expect(result.current.shouldShowLoadingSpinner).toBe(true);

    await act(async () => {
      resolveRequest({Nodes: []});
    });
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.folders).toEqual([]);
    expect(result.current.shouldShowLoadingSpinner).toBe(false);
  });

  it('shows the spinner only after a refresh stays loading for the configured delay', async () => {
    const {result} = renderUseGetCellsFolders();

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    expect(result.current.shouldShowLoadingSpinner).toBe(false);

    act(() => {
      clock.advanceByMilliseconds(1000);
    });
    expect(result.current.shouldShowLoadingSpinner).toBe(false);

    let resolveRequest: (response: {Nodes: RestNode[]}) => void = noop;
    cellsRepository.getAllNodes.mockReturnValueOnce(
      new Promise(resolve => {
        resolveRequest = resolve;
      }),
    );
    let refreshPromise: Promise<void> = Promise.resolve();
    act(() => {
      refreshPromise = result.current.refresh();
    });

    expect(result.current.status).toBe('loading');
    expect(result.current.shouldShowLoadingSpinner).toBe(false);

    act(() => {
      clock.advanceByMilliseconds(999);
    });
    expect(result.current.shouldShowLoadingSpinner).toBe(false);

    act(() => {
      clock.advanceByMilliseconds(1);
    });
    expect(result.current.shouldShowLoadingSpinner).toBe(true);

    await act(async () => {
      resolveRequest({Nodes: []});
      await refreshPromise;
    });
    expect(result.current.status).toBe('success');
    expect(result.current.shouldShowLoadingSpinner).toBe(false);
  });

  it('ignores stale folder responses when refreshes resolve out of order', async () => {
    const {result} = renderUseGetCellsFolders();

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    const staleFolder = {
      Type: 'COLLECTION',
      Uuid: 'stale-folder',
      Path: 'wire-cells-web/stale',
    } as RestNode;
    const latestFolder = {
      Type: 'COLLECTION',
      Uuid: 'latest-folder',
      Path: 'wire-cells-web/latest',
    } as RestNode;
    let resolveStale: (response: {Nodes: RestNode[]}) => void = noop;
    let resolveLatest: (response: {Nodes: RestNode[]}) => void = noop;
    cellsRepository.getAllNodes
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolveStale = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolveLatest = resolve;
        }),
      );

    let staleRequest: Promise<void> = Promise.resolve();
    let latestRequest: Promise<void> = Promise.resolve();
    act(() => {
      staleRequest = result.current.refresh();
    });
    act(() => {
      latestRequest = result.current.refresh();
    });

    await act(async () => {
      resolveLatest({Nodes: [latestFolder]});
      await latestRequest;
    });
    expect(result.current.folders).toEqual([{id: 'latest-folder', name: 'latest', path: 'wire-cells-web/latest'}]);

    await act(async () => {
      resolveStale({Nodes: [staleFolder]});
      await staleRequest;
    });
    expect(result.current.status).toBe('success');
    expect(result.current.folders).toEqual([{id: 'latest-folder', name: 'latest', path: 'wire-cells-web/latest'}]);
  });

  it('reports a load error without exposing stale folders', async () => {
    cellsRepository.getAllNodes.mockRejectedValue(new Error('folder load failed'));
    const {result} = renderUseGetCellsFolders();

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.folders).toEqual([]);
    expect(result.current.shouldShowLoadingSpinner).toBe(false);
  });
});
