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

import {useState} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {CellNode} from 'Components/Conversation/ConversationCells/common/cellNode/cellNode';
import {getCellsApiPath} from 'Components/Conversation/ConversationCells/common/getCellsApiPath/getCellsApiPath';
import {openBreadcrumb} from 'Components/Conversation/ConversationCells/common/openBreadcrumb/openBreadcrumb';
import {CellsRepository} from 'Repositories/cells/CellsRepository';

interface UseMoveCellsNodeProps {
  cellsRepository: CellsRepository;
  nodeToMove: CellNode;
  conversationQualifiedId: QualifiedId;
  currentPath: string;
  onClose: () => void;
}

export const useMoveCellsNode = ({
  cellsRepository,
  nodeToMove,
  conversationQualifiedId,
  currentPath,
  onClose,
}: UseMoveCellsNodeProps) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const moveNode = async ({currentPath, targetPath}: {currentPath: string; targetPath: string}) => {
    setStatus('loading');
    try {
      await cellsRepository.moveNode({
        currentPath,
        targetPath,
      });
      setStatus('success');
    } catch (error) {
      setStatus('error');
    }
  };

  const nodeToMoveParent = nodeToMove.path.split('/').slice(0, -1).join('/');
  const targetPath = getCellsApiPath({conversationQualifiedId, currentPath});
  const movingDisabled = nodeToMoveParent === targetPath;

  const handleMove = async () => {
    await moveNode({
      currentPath: nodeToMove.path,
      targetPath,
    });
    onClose();
    openBreadcrumb({
      conversationQualifiedId,
      path: currentPath,
    });
  };

  return {handleMove, movingDisabled, status};
};
