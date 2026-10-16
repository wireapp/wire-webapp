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
import {Result} from 'true-myth';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {CellNode} from 'src/script/types/cellNode';

import {useMoveCellsNode} from './useMoveCellsNode';

describe('useMoveCellsNode', () => {
  const nodeToMove = {path: 'wire-cells-web/source/file.txt'} as CellNode;
  const conversationQualifiedId = {id: 'conversation-id', domain: 'wire.com'};
  let cellsRepository: jest.Mocked<CellsRepository>;

  beforeEach(() => {
    cellsRepository = {
      moveNode: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CellsRepository>;
  });

  it('returns success after moving the selected node to the current folder', async () => {
    const {result} = renderHook(() => {
      return useMoveCellsNode({
        cellsRepository,
        nodeToMove,
        conversationQualifiedId,
        currentPath: 'wire-cells-web/destination',
        isOpen: true,
      });
    });

    let moveResult: Result<void, unknown> | undefined;
    await act(async () => {
      moveResult = await result.current.handleMove();
    });

    expect(cellsRepository.moveNode).toHaveBeenCalledWith({
      currentPath: nodeToMove.path,
      targetPath: 'conversation-id@wire.com/wire-cells-web/destination',
    });
    expect(moveResult?.isOk).toBe(true);
    expect(result.current.status).toBe('success');
  });

  it('returns the failure and keeps the operation status in error when moving fails', async () => {
    const moveError = new Error('move failed');
    cellsRepository.moveNode.mockRejectedValue(moveError);
    const {result} = renderHook(() => {
      return useMoveCellsNode({
        cellsRepository,
        nodeToMove,
        conversationQualifiedId,
        currentPath: 'wire-cells-web/destination',
        isOpen: true,
      });
    });

    let moveResult: Result<void, unknown> | undefined;
    await act(async () => {
      moveResult = await result.current.handleMove();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(moveResult?.isErr).toBe(true);
    if (moveResult?.isErr) {
      expect(moveResult.error).toBe(moveError);
    }
  });
});
