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
import {getCellsFilesPath} from 'Components/Conversation/ConversationCells/common/getCellsFilesPath/getCellsFilesPath';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {CellsRepository} from 'src/script/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';

import {CellsFoldersListModalContent} from './CellsFoldersListModalContent/CellsFoldersListModalContent';
import {modalStyles, wrapperStyles} from './CellsMoveNodeModal.styles';
import {CellsMoveNodeModalHeader} from './CellsMoveNodeModalHeader/CellsMoveNodeModalHeader';
import {CellsNewFolderModalContent} from './CellsNewFolderModalContent/CellsNewFolderModalContent';
import {useGetCellsFolders} from './useGetCellsFolders/useGetCellsFolders';

interface CellsMoveNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  conversationName: string;
  nodeToMove: CellNode;
}

export const CellsMoveNodeModal = ({
  nodeToMove,
  isOpen,
  onClose,
  cellsRepository,
  conversationQualifiedId,
  conversationName,
}: CellsMoveNodeModalProps) => {
  const [currentPath, setCurrentPath] = useState(() => getCellsFilesPath());
  const [activeModalContent, setActiveModalContent] = useState<'move' | 'create'>('move');

  const {folders, refresh, status, shouldShowLoadingSpinner} = useGetCellsFolders({
    cellsRepository,
    conversationQualifiedId,
    currentPath,
    enabled: isOpen,
  });

  return (
    <ModalComponent isShown={isOpen} onClosed={onClose} onBgClick={onClose} wrapperCSS={modalStyles}>
      <div css={wrapperStyles}>
        <CellsMoveNodeModalHeader
          onClose={onClose}
          title={
            activeModalContent === 'move' ? t('cells.moveNodeModal.moveTitle') : t('cells.moveNodeModal.createTitle')
          }
        />
        {activeModalContent === 'move' ? (
          <CellsFoldersListModalContent
            nodeToMove={nodeToMove}
            items={folders}
            status={status}
            shouldShowLoadingSpinner={shouldShowLoadingSpinner}
            conversationQualifiedId={conversationQualifiedId}
            conversationName={conversationName}
            cellsRepository={cellsRepository}
            currentPath={currentPath}
            onPathChange={setCurrentPath}
            onChangeModalContent={setActiveModalContent}
            onClose={onClose}
          />
        ) : (
          <CellsNewFolderModalContent
            cellsRepository={cellsRepository}
            conversationQualifiedId={conversationQualifiedId}
            currentPath={currentPath}
            onRefresh={refresh}
            onChangeModalContent={setActiveModalContent}
          />
        )}
      </div>
    </ModalComponent>
  );
};
