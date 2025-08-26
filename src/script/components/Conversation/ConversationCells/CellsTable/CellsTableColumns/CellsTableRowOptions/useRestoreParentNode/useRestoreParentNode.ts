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

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {CellNode} from 'Components/Conversation/ConversationCells/common/cellNode/cellNode';
import {getCellsApiPath} from 'Components/Conversation/ConversationCells/common/getCellsApiPath/getCellsApiPath';
import {openBreadcrumb} from 'Components/Conversation/ConversationCells/common/openBreadcrumb/openBreadcrumb';
import {
  getNodeRootParentPath,
  RECYCLE_BIN_PATH,
} from 'Components/Conversation/ConversationCells/common/recycleBin/recycleBin';
import {useCellsStore} from 'Components/Conversation/ConversationCells/common/useCellsStore/useCellsStore';
import {CellsRepository} from 'Repositories/cells/CellsRepository';

interface UseRestoreParentNodeProps {
  childNode: CellNode;
  conversationQualifiedId: QualifiedId;
  cellsRepository: CellsRepository;
  onError: () => void;
}

export const useRestoreParentNode = ({
  childNode,
  conversationQualifiedId,
  cellsRepository,
  onError,
}: UseRestoreParentNodeProps) => {
  const {removeNode} = useCellsStore();
  const rootParentName = getNodeRootParentPath({nodePath: childNode.path});
  const path = getCellsApiPath({
    conversationQualifiedId,
    currentPath: `${RECYCLE_BIN_PATH}/${rootParentName}`,
  });

  return {
    restoreParentNode: async () => {
      try {
        const rootParentNode = await cellsRepository.lookupNodeByPath({path});

        if (!rootParentNode) {
          throw new Error('Root parent node not found');
        }

        await cellsRepository.restoreNode({uuid: rootParentNode.Uuid});
        removeNode({conversationId: conversationQualifiedId.id, nodeId: rootParentNode.Uuid});

        // Workaround to ensure UI updates complete before navigation
        setTimeout(() => {
          openBreadcrumb({
            conversationQualifiedId,
            path: RECYCLE_BIN_PATH,
          });
        });
      } catch (error) {
        console.error(error);
        onError();
      }
    },
    rootParentName,
  };
};
