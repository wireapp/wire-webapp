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

import {useState} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {task} from 'true-myth';

import {getCellsApiPath} from 'Components/conversation/conversationCells/common/getCellsApiPath/getCellsApiPath';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {CellNode} from 'src/script/types/cellNode';

interface UseLegacyMoveCellsNodeProps {
  cellsRepository: CellsRepository;
  nodeToMove: CellNode;
  conversationQualifiedId: QualifiedId;
  currentPath: string;
  onClose: () => void;
  navigateToPath: (params: {conversationQualifiedId: QualifiedId; path: string}) => void;
}

type UseLegacyMoveCellsNodeResult = {
  handleMove: () => Promise<void>;
  movingDisabled: boolean;
  status: 'idle' | 'loading' | 'error' | 'success';
};
export const useLegacyMoveCellsNode = ({
  cellsRepository,
  nodeToMove,
  conversationQualifiedId,
  currentPath,
  onClose,
  navigateToPath,
}: UseLegacyMoveCellsNodeProps): UseLegacyMoveCellsNodeResult => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const nodeToMoveParent = nodeToMove.path.split('/').slice(0, -1).join('/');
  const targetPath = getCellsApiPath({conversationQualifiedId, currentPath});
  const movingDisabled = nodeToMoveParent === targetPath;

  const handleMove = async (): Promise<void> => {
    setStatus('loading');
    const moveResult = await task.tryOrElse(
      error => {
        return error;
      },
      () => {
        return cellsRepository.moveNode({currentPath: nodeToMove.path, targetPath});
      },
    );
    setStatus(moveResult.isErr ? 'error' : 'success');

    // Keep the pre-flag single-item flow intact until the bulk move replaces it.
    onClose();
    navigateToPath({conversationQualifiedId, path: currentPath});
  };

  return {handleMove, movingDisabled, status};
};
