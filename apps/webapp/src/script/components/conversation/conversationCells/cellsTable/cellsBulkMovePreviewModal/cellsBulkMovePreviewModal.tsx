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

import type {FunctionComponent} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user/';
import type {RestPerformActionResponse} from 'cells-sdk-ts';

import type {
  SharedDriveMoveItem,
  SharedDriveMoveSummary,
} from 'Components/conversation/conversationCells/sharedDriveUploadStatusContext';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
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
  isMoveRequestError: boolean;
  isMoveRequestPending: boolean;
  onMoveStart: (summary: SharedDriveMoveSummary) => void;
  onMoveResult: (response: RestPerformActionResponse, summary: SharedDriveMoveSummary) => boolean;
  onMoveError: () => void;
  isBackgroundMovePending: boolean;
  isBackgroundMoveError: boolean;
  isBackgroundMoveRetryBlocked: boolean;
  isBackgroundMoveStatusUnknown: boolean;
  canRetryBackgroundMoveStatus: boolean;
  onRetryBackgroundMoveStatus: () => void;
  onRefresh: () => void;
}

export const CellsBulkMovePreviewModal: FunctionComponent<CellsBulkMovePreviewModalProps> = ({
  isOpen,
  onClose,
  selectedNodes,
  cellsRepository,
  conversationQualifiedId,
  conversationName,
  isMoveOutcomeUnresolved,
  isMoveRequestError,
  isMoveRequestPending,
  onMoveStart,
  onMoveResult,
  onMoveError,
  isBackgroundMovePending,
  isBackgroundMoveError,
  isBackgroundMoveRetryBlocked,
  isBackgroundMoveStatusUnknown,
  canRetryBackgroundMoveStatus,
  onRetryBackgroundMoveStatus,
  onRefresh,
}: CellsBulkMovePreviewModalProps) => {
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
  const handleClose = (): void => {
    if (move.isSubmitting || isMoveRequestPending || isBackgroundMovePending) {
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
      isMoveOutcomeUnresolved={isMoveOutcomeUnresolved}
      isMoveRequestError={isMoveRequestError}
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
      isBackgroundMoveError={isBackgroundMoveError}
      isBackgroundMoveStatusUnknown={isBackgroundMoveStatusUnknown}
      canRetryBackgroundMoveStatus={canRetryBackgroundMoveStatus}
      onRetryBackgroundMoveStatus={onRetryBackgroundMoveStatus}
      onRefresh={onRefresh}
    />
  );
};
