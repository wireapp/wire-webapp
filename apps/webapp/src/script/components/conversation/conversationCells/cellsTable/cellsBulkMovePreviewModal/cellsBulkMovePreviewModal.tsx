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

import {QualifiedId} from '@wireapp/api-client/lib/user/';

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
}

export const CellsBulkMovePreviewModal = ({
  isOpen,
  onClose,
  selectedNodes,
  cellsRepository,
  conversationQualifiedId,
  conversationName,
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
    if (move.isSubmitting) {
      return;
    }

    onClose();
  };

  return (
    <CellsBulkMovePreviewPresentation
      isOpen={isOpen}
      onClose={handleClose}
      selectedNodes={selectedNodes}
      conversationName={conversationName}
      destination={destination}
      onMove={move.submitMove}
      isMoveDisabled={!move.isValid || move.isSubmitting || destination.status !== 'success'}
      isMoveLoading={move.isSubmitting}
    />
  );
};
