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

import {useMemo, useState} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user/';

import {CellsModal} from 'Components/conversation/conversationCells/common/cellsModal/cellsModal';
import {getCellsFilesPath} from 'Components/conversation/conversationCells/common/getCellsFilesPath/getCellsFilesPath';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';

import {CellsFoldersListModalContent} from '../cellsTableColumns/cellsTableRowOptions/cellsMoveNodeModal/cellsFoldersListModalContent/cellsFoldersListModalContent';
import {useGetCellsFolders} from '../cellsTableColumns/cellsTableRowOptions/cellsMoveNodeModal/useGetCellsFolders/useGetCellsFolders';

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
  const {clock, fireAndForgetInvoker, translate} = useApplicationContext();
  const rootPath = getCellsFilesPath();
  const [currentPath, setCurrentPath] = useState(rootPath);
  const [selectedDestinationPath, setSelectedDestinationPath] = useState(rootPath);
  const {folders, status, shouldShowLoadingSpinner} = useGetCellsFolders({
    cellsRepository,
    conversationQualifiedId,
    currentPath,
    enabled: isOpen,
    fireAndForgetInvoker,
    clock,
  });

  const selectedFolderPaths = useMemo(() => {
    return selectedNodes
      .filter(node => {
        return node.type === CellNodeType.FOLDER;
      })
      .map(node => {
        return node.path;
      });
  }, [selectedNodes]);
  const disabledDestinationPaths = useMemo(() => {
    return [...selectedFolderPaths, currentPath];
  }, [selectedFolderPaths, currentPath]);
  const disabledDestinationLabels = useMemo(() => {
    return Object.fromEntries([
      ...selectedFolderPaths.map(path => {
        return [path, translate('cells.bulkMove.selected')];
      }),
      [currentPath, translate('cells.bulkMove.currentLocation')],
    ]);
  }, [selectedFolderPaths, currentPath, translate]);

  const currentDestination =
    selectedDestinationPath === rootPath
      ? translate('cells.bulkMove.drive')
      : (selectedDestinationPath.split('/').filter(Boolean).at(-1) ?? translate('cells.bulkMove.drive'));

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
      <p aria-live="polite">{translate('cells.bulkMove.currentDestination', {destination: currentDestination})}</p>
      <CellsFoldersListModalContent
        items={folders}
        status={status}
        shouldShowLoadingSpinner={shouldShowLoadingSpinner}
        conversationName={conversationName}
        currentPath={currentPath}
        onPathChange={setCurrentPath}
        onSelectDestination={setSelectedDestinationPath}
        selectedDestinationPath={selectedDestinationPath}
        disabledDestinationPaths={disabledDestinationPaths}
        disabledDestinationLabels={disabledDestinationLabels}
      />
      <CellsModal.Actions>
        <CellsModal.SecondaryButton onClick={onClose}>
          {translate('cells.moveNodeModal.cancelButton')}
        </CellsModal.SecondaryButton>
      </CellsModal.Actions>
    </CellsModal>
  );
};
