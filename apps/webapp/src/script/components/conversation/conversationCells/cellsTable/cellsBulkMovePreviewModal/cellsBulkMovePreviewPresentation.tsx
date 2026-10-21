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

import {RestActionStatus, type RestPerformActionResponse} from 'cells-sdk-ts';
import type {Result} from 'true-myth';

import {CellsModal} from 'Components/conversation/conversationCells/common/cellsModal/cellsModal';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {CellNode} from 'src/script/types/cellNode';

import {BulkMoveDestinationSelection} from './useBulkMoveDestinationSelection';

import {CellsFoldersListModalContent} from '../cellsTableColumns/cellsTableRowOptions/cellsMoveNodeModal/cellsFoldersListModalContent/cellsFoldersListModalContent';

interface CellsBulkMovePreviewPresentationProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNodes: CellNode[];
  conversationName: string;
  destination: BulkMoveDestinationSelection;
  onMove: () => Promise<Result<RestPerformActionResponse, unknown>>;
  onMoveResult: (response: RestPerformActionResponse) => void;
  onMoveError: () => void;
  isMoveOutcomeUnresolved: boolean;
  isMoveRequestError: boolean;
  isMoveDisabled: boolean;
  isMoveLoading: boolean;
}

export const CellsBulkMovePreviewPresentation: FunctionComponent<CellsBulkMovePreviewPresentationProps> = ({
  isOpen,
  onClose,
  selectedNodes,
  conversationName,
  destination,
  onMove,
  onMoveResult,
  onMoveError,
  isMoveOutcomeUnresolved,
  isMoveRequestError,
  isMoveDisabled,
  isMoveLoading,
}: CellsBulkMovePreviewPresentationProps) => {
  const {translate} = useApplicationContext();

  const handleMove = async (): Promise<void> => {
    const moveResult = await onMove();
    if (moveResult.isErr) {
      onMoveError();
      return;
    }

    if (moveResult.isOk) {
      onMoveResult(moveResult.value);
      if (moveResult.value.Status === RestActionStatus.Performed) {
        onClose();
      }
    }
  };

  return (
    <CellsModal isOpen={isOpen} onClose={onClose} size="large">
      <CellsModal.Header>
        {selectedNodes.length === 1
          ? translate('cells.bulkMove.previewTitleSingular')
          : translate('cells.bulkMove.previewTitle', {count: selectedNodes.length})}
      </CellsModal.Header>
      <p>{translate('cells.bulkMove.previewDescription')}</p>
      <section aria-labelledby="bulk-move-selected-items-heading">
        <h3 id="bulk-move-selected-items-heading">{translate('cells.bulkMove.selectedItems')}</h3>
        <ul>
          {selectedNodes.map(node => {
            return <li key={node.id}>{node.name}</li>;
          })}
        </ul>
      </section>
      <p aria-live="polite">
        {translate('cells.bulkMove.currentDestination', {destination: destination.currentDestination})}
      </p>
      <CellsFoldersListModalContent
        conversationName={conversationName}
        destination={destination}
        getCurrentPathFromFolder={path => {
          return path;
        }}
      />
      {isMoveOutcomeUnresolved && (
        <div role="alert">
          <p>
            {isMoveRequestError
              ? translate('cells.newItemMenuModalForm.genericError')
              : translate('cells.bulkMove.outcomeUnresolved')}
          </p>
        </div>
      )}
      <CellsModal.Actions>
        <CellsModal.SecondaryButton onClick={onClose}>
          {translate('cells.moveNodeModal.cancelButton')}
        </CellsModal.SecondaryButton>
        <CellsModal.PrimaryButton onClick={handleMove} isDisabled={isMoveDisabled}>
          {translate(isMoveLoading ? 'cells.bulkMove.movingButton' : 'cells.bulkMove.moveButton')}
        </CellsModal.PrimaryButton>
      </CellsModal.Actions>
    </CellsModal>
  );
};
