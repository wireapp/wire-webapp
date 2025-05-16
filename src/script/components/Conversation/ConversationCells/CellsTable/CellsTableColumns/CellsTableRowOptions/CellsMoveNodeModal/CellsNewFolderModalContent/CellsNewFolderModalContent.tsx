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

import {CellsNewItemForm} from 'Components/Conversation/ConversationCells/common/CellsNewItemForm/CellsNewItemForm';
import {CellsRepository} from 'src/script/cells/CellsRepository';

interface CellsNewFolderModalContentProps {
  currentPath: string;
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  onRefresh: () => Promise<void>;
  onChangeModalContent: (content: 'move' | 'create') => void;
}

export const CellsNewFolderModalContent = ({
  cellsRepository,
  conversationQualifiedId,
  currentPath,
  onChangeModalContent,
  onRefresh,
}: CellsNewFolderModalContentProps) => {
  return (
    <CellsNewItemForm
      type="folder"
      cellsRepository={cellsRepository}
      conversationQualifiedId={conversationQualifiedId}
      onSuccess={() => {
        void onRefresh();
        onChangeModalContent('move');
      }}
      currentPath={currentPath}
      onSecondaryButtonClick={() => onChangeModalContent('move')}
    />
  );
};
