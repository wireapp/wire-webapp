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
}

export const CellsBulkMovePreviewPresentation = ({
  isOpen,
  onClose,
  selectedNodes,
  conversationName,
  destination,
}: CellsBulkMovePreviewPresentationProps) => {
  const {translate} = useApplicationContext();

  return (
    <CellsModal isOpen={isOpen} onClose={onClose} size="large">
      <CellsModal.Header>{translate('cells.bulkMove.previewTitle', {count: selectedNodes.length})}</CellsModal.Header>
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
        items={destination.folders}
        status={destination.status}
        shouldShowLoadingSpinner={destination.shouldShowLoadingSpinner}
        conversationName={conversationName}
        currentPath={destination.currentPath}
        onPathChange={destination.handlePathChange}
        onSelectDestination={destination.handleDestinationSelect}
        selectedDestinationPath={destination.selectedDestinationPath}
        disabledDestinationPaths={destination.disabledDestinationPaths}
        disabledDestinationLabels={destination.disabledDestinationLabels}
      />
      <CellsModal.Actions>
        <CellsModal.SecondaryButton onClick={onClose}>
          {translate('cells.moveNodeModal.cancelButton')}
        </CellsModal.SecondaryButton>
      </CellsModal.Actions>
    </CellsModal>
  );
};
