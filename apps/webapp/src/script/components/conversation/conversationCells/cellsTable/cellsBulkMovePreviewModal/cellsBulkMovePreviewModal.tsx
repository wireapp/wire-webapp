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

import {useEffect, useState, type FunctionComponent} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user/';
import type {RestPerformActionResponse} from 'cells-sdk-ts';

import {
  CELLS_ACTION,
  useCellsActionPermissions,
} from 'Components/conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {useCellsNewFolderForm} from 'Components/conversation/conversationCells/common/useCellsNewNodeForm/useCellsNewFolderForm';
import type {
  SharedDriveMoveItem,
  SharedDriveMoveSummary,
} from 'Components/conversation/conversationCells/sharedDriveUploadStatusContext';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {CellNode} from 'src/script/types/cellNode';

import {CellsBulkMovePreviewPresentation} from './cellsBulkMovePreviewPresentation';
import {useBulkMoveDestinationSelection} from './useBulkMoveDestinationSelection';
import {useMoveSelectedCellsNodes} from './useMoveSelectedCellsNodes';

interface CellsBulkMovePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNodes: CellNode[];
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  conversationName: string;
  isMoveOutcomeUnresolved: boolean;
  isMoveRequestPending: boolean;
  onMoveStart: (summary: SharedDriveMoveSummary) => void;
  onMoveResult: (response: RestPerformActionResponse, summary: SharedDriveMoveSummary) => boolean;
  onMoveError: (isSimulated?: boolean) => void;
  isBackgroundMovePending: boolean;
  isBackgroundMoveError: boolean;
  isBackgroundMoveRetryBlocked: boolean;
  isBackgroundMoveStatusUnknown: boolean;
}

export const CellsBulkMovePreviewModal: FunctionComponent<CellsBulkMovePreviewModalProps> = ({
  isOpen,
  onClose,
  selectedNodes,
  cellsRepository,
  conversationQualifiedId,
  conversationName,
  isMoveOutcomeUnresolved,
  isMoveRequestPending,
  onMoveStart,
  onMoveResult,
  onMoveError,
  isBackgroundMovePending,
  isBackgroundMoveError,
  isBackgroundMoveRetryBlocked,
  isBackgroundMoveStatusUnknown,
}: CellsBulkMovePreviewModalProps) => {
  const {fireAndForgetInvoker, translate} = useApplicationContext();
  const canPerformDriveAction = useCellsActionPermissions();
  const [activeModalContent, setActiveModalContent] = useState<'move' | 'create'>('move');
  const hasCreatePermission = canPerformDriveAction(CELLS_ACTION.CREATE);
  const destination = useBulkMoveDestinationSelection({
    isOpen,
    selectedNodes,
    cellsRepository,
    conversationQualifiedId,
  });
  const move = useMoveSelectedCellsNodes({
    conversationQualifiedId,
    destinationPath: destination.selectedDestinationPath,
    selectedNodes,
    cellsRepository,
  });
  const folderCreationForm = useCellsNewFolderForm({
    cellsRepository,
    conversationQualifiedId,
    onSuccess: () => {
      fireAndForgetInvoker.fireAndForget(destination.refresh);
      setActiveModalContent('move');
    },
    currentPath: destination.currentPath,
    isOpen: isOpen && activeModalContent === 'create',
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
  useEffect(() => {
    if (!hasCreatePermission) {
      setActiveModalContent('move');
    }
  }, [hasCreatePermission]);

  const canCreateNewFolder =
    isOpen &&
    hasCreatePermission &&
    !folderCreationForm.isSubmitting &&
    !move.isSubmitting &&
    !isMoveRequestPending &&
    !isMoveOutcomeUnresolved &&
    !isBackgroundMovePending &&
    !isBackgroundMoveRetryBlocked &&
    !isBackgroundMoveError &&
    !isBackgroundMoveStatusUnknown;

  const handleCreateFolder = (event: Parameters<typeof folderCreationForm.handleSubmit>[0]): Promise<void> => {
    if (!hasCreatePermission) {
      setActiveModalContent('move');
      return Promise.resolve();
    }

    return folderCreationForm.handleSubmit(event);
  };

  const handleChangeModalContent = (content: 'move' | 'create'): void => {
    if (folderCreationForm.isSubmitting) {
      return;
    }

    setActiveModalContent(content);
  };

  const handleClose = (): void => {
    if (folderCreationForm.isSubmitting || move.isSubmitting || isMoveRequestPending || isBackgroundMovePending) {
      return;
    }

    onClose();
  };

  return (
    <CellsBulkMovePreviewPresentation
      isOpen={isOpen}
      onClose={handleClose}
      conversationName={conversationName}
      destination={destination}
      onMove={move.submitMove}
      onMoveStart={onMoveStart}
      onMoveResult={onMoveResult}
      selectedItems={selectedNodes.map((node): SharedDriveMoveItem => {
        return {id: node.id, name: node.name, isFolder: node.type === 'folder'};
      })}
      destinationPath={destination.selectedDestinationPath}
      onMoveError={onMoveError}
      isMoveDisabled={
        !move.isValid ||
        destination.disabledDestinationPaths.includes(destination.selectedDestinationPath) ||
        move.isSubmitting ||
        isMoveRequestPending ||
        isMoveOutcomeUnresolved ||
        isBackgroundMovePending ||
        isBackgroundMoveRetryBlocked ||
        isBackgroundMoveStatusUnknown ||
        destination.status !== 'success'
      }
      isMoveLoading={move.isSubmitting}
      isBackgroundMovePending={isBackgroundMovePending}
      activeModalContent={activeModalContent}
      onChangeModalContent={handleChangeModalContent}
      canCreateNewFolder={canCreateNewFolder}
      folderCreationForm={{...folderCreationForm, handleSubmit: handleCreateFolder}}
    />
  );
};
