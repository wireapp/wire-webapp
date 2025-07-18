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
import {useCellsStore} from 'Components/Conversation/ConversationCells/common/useCellsStore/useCellsStore';
import {CellsRepository} from 'Repositories/cells/CellsRepository';

interface UseRestoreNestedNodeProps {
  node: CellNode;
  conversationQualifiedId: QualifiedId;
  cellsRepository: CellsRepository;
  onError: () => void;
}

export const useRestoreNestedNode = ({
  node,
  conversationQualifiedId,
  cellsRepository,
  onError,
}: UseRestoreNestedNodeProps) => {
  const {removeNode} = useCellsStore();

  return {
    restoreNestedNode: async () => {
      try {
        removeNode({conversationId: conversationQualifiedId.id, nodeId: node.id});
        await cellsRepository.restoreNode({uuid: node.id});
      } catch (error) {
        console.error(error);
        onError();
      }
    },
  };
};
