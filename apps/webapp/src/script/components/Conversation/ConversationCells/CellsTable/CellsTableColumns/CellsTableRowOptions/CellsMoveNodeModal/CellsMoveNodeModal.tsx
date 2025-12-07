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
import {CellsModal} from 'Components/Conversation/ConversationCells/common/CellsModal/CellsModal';
import {CellsNewNodeForm} from 'Components/Conversation/ConversationCells/common/CellsNewNodeForm/CellsNewNodeForm';
import {getCellsFilesPath} from 'Components/Conversation/ConversationCells/common/getCellsFilesPath/getCellsFilesPath';
import {useCellsNewItemForm} from 'Components/Conversation/ConversationCells/common/useCellsNewNodeForm/useCellsNewNodeForm';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';
import {t} from 'Util/LocalizerUtil';

import {CellsFoldersListModalContent} from './CellsFoldersListModalContent/CellsFoldersListModalContent';
import {useGetCellsFolders} from './useGetCellsFolders/useGetCellsFolders';
import {useMoveCellsNode} from './useMoveCellNode/useMoveCellsNode';

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
    nodeToMove,
    cellsRepository,
    conversationQualifiedId,
    currentPath,
    enabled: isOpen,
  });

  const {
    handleMove,
    movingDisabled,
    status: moveNodeStatus,
  } = useMoveCellsNode({
    cellsRepository,
    nodeToMove,
    conversationQualifiedId,
    currentPath,
    onClose,
  });

  const {
    name,
    error,
    isSubmitting,
    handleSubmit: handleCreateNewFolder,
    handleChange,
  } = useCellsNewItemForm({
    type: CellNodeType.FOLDER,
    cellsRepository,
    conversationQualifiedId,
    onSuccess: () => {
      void refresh();
      setActiveModalContent('move');
    },
    currentPath,
  });

  useEffect(() => {
    if (isOpen) {
      setActiveModalContent('move');
    }
  }, [isOpen]);

  const isMoveLoading = moveNodeStatus === 'loading';

  return (
    <CellsModal isOpen={isOpen} onClose={onClose} size="large">
      <CellsModal.Header>
        {activeModalContent === 'move' ? t('cells.moveNodeModal.moveTitle') : t('cells.moveNodeModal.createTitle')}
      </CellsModal.Header>
      {activeModalContent === 'move' ? (
        <>
          <CellsFoldersListModalContent
            items={folders}
            status={status}
            shouldShowLoadingSpinner={shouldShowLoadingSpinner}
            conversationName={conversationName}
            currentPath={currentPath}
            onPathChange={setCurrentPath}
            onChangeModalContent={setActiveModalContent}
          />
          <CellsModal.Actions>
            <CellsModal.SecondaryButton onClick={onClose}>
              {t('cells.moveNodeModal.cancelButton')}
            </CellsModal.SecondaryButton>
            <CellsModal.PrimaryButton
              onClick={handleMove}
              isDisabled={movingDisabled || shouldShowLoadingSpinner || isMoveLoading}
              isLoading={isMoveLoading}
            >
              {t('cells.moveNodeModal.moveButton')}
            </CellsModal.PrimaryButton>
          </CellsModal.Actions>
        </>
      ) : (
        <>
          <CellsNewNodeForm
            type={CellNodeType.FOLDER}
            onSubmit={handleCreateNewFolder}
            inputValue={name}
            onChange={handleChange}
            error={error}
            isOpen={isOpen}
          />
          <CellsModal.Actions>
            <CellsModal.SecondaryButton onClick={() => setActiveModalContent('move')}>
              {t('cells.newItemMenuModal.secondaryAction')}
            </CellsModal.SecondaryButton>
            <CellsModal.PrimaryButton onClick={handleCreateNewFolder} isDisabled={isSubmitting}>
              {t('cells.newItemMenuModal.primaryAction')}
            </CellsModal.PrimaryButton>
          </CellsModal.Actions>
        </>
      )}
    </CellsModal>
  );
};
