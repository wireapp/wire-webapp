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

import {CellsModal} from 'Components/conversation/conversationCells/common/cellsModal/cellsModal';
import {CellsNewNodeForm} from 'Components/conversation/conversationCells/common/cellsNewNodeForm/cellsNewNodeForm';
import {getCellsFilesPath} from 'Components/conversation/conversationCells/common/getCellsFilesPath/getCellsFilesPath';
import {openBreadcrumb} from 'Components/conversation/conversationCells/common/openBreadcrumb/openBreadcrumb';
import {useCellsNewFolderForm} from 'Components/conversation/conversationCells/common/useCellsNewNodeForm/useCellsNewFolderForm';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {driveBulkActionsFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {CellNode} from 'src/script/types/cellNode';

import {CellsFoldersListModalContent} from './cellsFoldersListModalContent/cellsFoldersListModalContent';
import {LegacyCellsMoveNodeModal} from './legacy/legacyCellsMoveNodeModal';
import {useGetCellsFolders} from './useGetCellsFolders/useGetCellsFolders';
import {useMoveCellsNode} from './useMoveCellNode/useMoveCellsNode';

interface CellsMoveNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  conversationName: string;
  nodeToMove: CellNode;
  navigateToPath?: (params: {conversationQualifiedId: QualifiedId; path: string}) => void;
}

const FlaggedCellsMoveNodeModal = ({
  nodeToMove,
  isOpen,
  onClose,
  cellsRepository,
  conversationQualifiedId,
  conversationName,
  navigateToPath = openBreadcrumb,
}: CellsMoveNodeModalProps) => {
  const {clock, fireAndForgetInvoker, translate} = useApplicationContext();
  const [currentPath, setCurrentPath] = useState(() => {
    return getCellsFilesPath();
  });
  const [activeModalContent, setActiveModalContent] = useState<'move' | 'create'>('move');

  const {folders, refresh, status, shouldShowLoadingSpinner} = useGetCellsFolders({
    nodeToMove,
    cellsRepository,
    conversationQualifiedId,
    currentPath,
    enabled: isOpen,
    fireAndForgetInvoker,
    clock,
  });

  const {
    handleMove: handleMoveOperation,
    movingDisabled,
    status: moveNodeStatus,
  } = useMoveCellsNode({
    cellsRepository,
    nodeToMove,
    conversationQualifiedId,
    currentPath,
    isOpen,
  });

  const {
    name,
    error,
    isSubmitting,
    handleSubmit: handleCreateNewFolder,
    handleChange,
    handleClear,
  } = useCellsNewFolderForm({
    cellsRepository,
    conversationQualifiedId,
    onSuccess: () => {
      fireAndForgetInvoker.fireAndForget(refresh);
      setActiveModalContent('move');
    },
    currentPath,
    isOpen,
    validationCopy: {
      genericError: translate('cells.newItemMenuModalForm.genericError'),
      alreadyExistsError: translate('cells.newItemMenuModalForm.alreadyExistsError'),
      invalidCharactersError: translate('cells.nodeName.invalidCharactersError'),
      maxLengthError: translate('cells.newItemMenuModalForm.maxLengthError'),
      nameRequired: translate('cells.newItemMenuModalForm.nameRequired'),
    },
  });

  useEffect(() => {
    if (isOpen) {
      setActiveModalContent('move');
    }
  }, [isOpen]);

  const isMoveLoading = moveNodeStatus === 'loading';

  const handleMove = async () => {
    const moveResult = await handleMoveOperation();
    if (moveResult.isErr) {
      return;
    }

    navigateToPath({conversationQualifiedId, path: currentPath});
    onClose();
  };

  return (
    <CellsModal isOpen={isOpen} onClose={onClose} size="large">
      <CellsModal.Header>
        {activeModalContent === 'move'
          ? translate('cells.moveNodeModal.moveTitle')
          : translate('cells.moveNodeModal.createTitle')}
      </CellsModal.Header>
      {activeModalContent === 'move' ? (
        <>
          <CellsFoldersListModalContent
            conversationName={conversationName}
            destination={{
              folders,
              status,
              shouldShowLoadingSpinner,
              currentPath,
              handlePathChange: setCurrentPath,
              onChangeModalContent: setActiveModalContent,
            }}
          />
          {moveNodeStatus === 'error' && <p role="alert">{translate('cells.newItemMenuModalForm.genericError')}</p>}
          <CellsModal.Actions>
            <CellsModal.SecondaryButton onClick={onClose}>
              {translate('cells.moveNodeModal.cancelButton')}
            </CellsModal.SecondaryButton>
            <CellsModal.PrimaryButton
              onClick={handleMove}
              isDisabled={status !== 'success' || movingDisabled || isMoveLoading}
              isLoading={isMoveLoading}
            >
              {translate('cells.moveNodeModal.moveButton')}
            </CellsModal.PrimaryButton>
          </CellsModal.Actions>
        </>
      ) : (
        <>
          <CellsNewNodeForm
            label={translate('cells.newItemMenuModal.labelFolder')}
            placeholder={translate('cells.newItemMenuModal.placeholderFolder')}
            onSubmit={handleCreateNewFolder}
            inputValue={name}
            onChange={handleChange}
            onClear={handleClear}
            error={error}
            isOpen={isOpen}
          />
          <CellsModal.Actions>
            <CellsModal.SecondaryButton
              onClick={() => {
                return setActiveModalContent('move');
              }}
            >
              {translate('cells.newItemMenuModal.secondaryAction')}
            </CellsModal.SecondaryButton>
            <CellsModal.PrimaryButton onClick={handleCreateNewFolder} isDisabled={isSubmitting}>
              {translate('cells.newItemMenuModal.primaryAction')}
            </CellsModal.PrimaryButton>
          </CellsModal.Actions>
        </>
      )}
    </CellsModal>
  );
};

export const CellsMoveNodeModal = (props: CellsMoveNodeModalProps) => {
  const {isFeatureToggleEnabled} = useApplicationContext();

  if (!isFeatureToggleEnabled(driveBulkActionsFeatureToggleName)) {
    return <LegacyCellsMoveNodeModal {...props} />;
  }

  return <FlaggedCellsMoveNodeModal {...props} />;
};
