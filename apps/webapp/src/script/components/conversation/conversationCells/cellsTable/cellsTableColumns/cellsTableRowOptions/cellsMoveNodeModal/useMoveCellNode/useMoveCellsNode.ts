/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useEffect, useState} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {Result, result, task} from 'true-myth';

import {getCellsApiPath} from 'Components/conversation/conversationCells/common/getCellsApiPath/getCellsApiPath';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {CellNode} from 'src/script/types/cellNode';

interface UseMoveCellsNodeProps {
  cellsRepository: CellsRepository;
  nodeToMove: CellNode;
  conversationQualifiedId: QualifiedId;
  currentPath: string;
  isOpen: boolean;
}

type UseMoveCellsNodeResult = {
  handleMove: () => Promise<Result<void, unknown>>;
  movingDisabled: boolean;
  status: 'idle' | 'loading' | 'success' | 'error';
};
export const useMoveCellsNode = ({
  cellsRepository,
  nodeToMove,
  conversationQualifiedId,
  currentPath,
  isOpen,
}: UseMoveCellsNodeProps): UseMoveCellsNodeResult => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
    }
  }, [isOpen]);

  const moveNode = async ({
    currentPath,
    targetPath,
  }: {
    currentPath: string;
    targetPath: string;
  }): Promise<Result<void, unknown>> => {
    setStatus('loading');
    const moveResult = await task.tryOrElse(
      error => {
        return error;
      },
      () => {
        return cellsRepository.moveNode({currentPath, targetPath});
      },
    );

    if (moveResult.isErr) {
      setStatus('error');
      return result.err(moveResult.error);
    }

    setStatus('success');
    return result.ok(undefined);
  };

  const nodeToMoveParent = nodeToMove.path.split('/').slice(0, -1).join('/');
  const targetPath = getCellsApiPath({conversationQualifiedId, currentPath});
  const movingDisabled = nodeToMoveParent === targetPath;

  const handleMove = (): Promise<Result<void, unknown>> => {
    return moveNode({
      currentPath: nodeToMove.path,
      targetPath,
    });
  };

  return {handleMove, movingDisabled, status};
};
