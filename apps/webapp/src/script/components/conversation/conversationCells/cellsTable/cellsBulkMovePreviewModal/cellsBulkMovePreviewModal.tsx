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
  const handlePathChange = (path: string): void => {
    setCurrentPath(path);

    const normalizedRootPath = rootPath.replace(/\/+$/, '');
    const normalizedPath = path.replace(/^\/+/, '');
    let destinationPath = normalizedPath;
    if (normalizedRootPath.length > 0 && !normalizedPath.startsWith(`${normalizedRootPath}/`)) {
      destinationPath = [normalizedRootPath, normalizedPath].filter(Boolean).join('/');
    }

    setSelectedDestinationPath(destinationPath);
  };
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

  const driveLabel = translate('cells.bulkMove.drive');
  const normalizedRootPath = rootPath.replace(/\/+$/, '');
  const normalizedDestinationPath = selectedDestinationPath.replace(/^\/+|\/+$/g, '');
  let relativeDestinationPath = normalizedDestinationPath;
  if (normalizedDestinationPath === normalizedRootPath) {
    relativeDestinationPath = '';
  } else if (normalizedRootPath.length > 0 && normalizedDestinationPath.startsWith(`${normalizedRootPath}/`)) {
    relativeDestinationPath = normalizedDestinationPath.slice(normalizedRootPath.length + 1);
  }
  const currentDestination =
    relativeDestinationPath.length > 0
      ? `${driveLabel} / ${relativeDestinationPath.split('/').filter(Boolean).join(' / ')}`
      : driveLabel;

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
        onPathChange={handlePathChange}
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
