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

import {type ReactNode, useMemo, useState} from 'react';

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

interface UseBulkMoveDestinationSelectionProps {
  isOpen: boolean;
  selectedNodes: CellNode[];
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
}

interface BulkMovePreviewPresentationProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNodes: CellNode[];
  currentDestination: string;
  children: ReactNode;
}

const normalizeDestinationPath = (path: string, rootPath: string): string => {
  const normalizedRootPath = rootPath.replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  if (normalizedPath === normalizedRootPath) {
    return '';
  }

  if (normalizedRootPath.length > 0 && normalizedPath.startsWith(`${normalizedRootPath}/`)) {
    return normalizedPath.slice(normalizedRootPath.length + 1);
  }

  return normalizedPath;
};

const getDestinationPath = (path: string, rootPath: string): string => {
  const normalizedRootPath = rootPath.replace(/\/+$/, '');
  const relativePath = normalizeDestinationPath(path, rootPath);
  return relativePath.length > 0 ? [normalizedRootPath, relativePath].filter(Boolean).join('/') : rootPath;
};

const useBulkMoveDestinationSelection = ({
  isOpen,
  selectedNodes,
  cellsRepository,
  conversationQualifiedId,
}: UseBulkMoveDestinationSelectionProps) => {
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

  const handlePathChange = (path: string): void => {
    setCurrentPath(path);
    setSelectedDestinationPath(getDestinationPath(path, rootPath));
  };
  const handleDestinationSelect = (path: string): void => {
    setSelectedDestinationPath(getDestinationPath(path, rootPath));
  };

  const driveLabel = translate('cells.bulkMove.drive');
  const relativeDestinationPath = normalizeDestinationPath(selectedDestinationPath, rootPath);
  const currentDestination =
    relativeDestinationPath.length > 0
      ? `${driveLabel} / ${relativeDestinationPath.split('/').filter(Boolean).join(' / ')}`
      : driveLabel;

  return {
    currentDestination,
    currentPath,
    disabledDestinationLabels,
    disabledDestinationPaths,
    folders,
    handleDestinationSelect,
    handlePathChange,
    selectedDestinationPath,
    shouldShowLoadingSpinner,
    status,
  };
};

const BulkMovePreviewPresentation = ({
  isOpen,
  onClose,
  selectedNodes,
  currentDestination,
  children,
}: BulkMovePreviewPresentationProps) => {
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
      <p aria-live="polite">{translate('cells.bulkMove.currentDestination', {destination: currentDestination})}</p>
      {children}
      <CellsModal.Actions>
        <CellsModal.SecondaryButton onClick={onClose}>
          {translate('cells.moveNodeModal.cancelButton')}
        </CellsModal.SecondaryButton>
      </CellsModal.Actions>
    </CellsModal>
  );
};

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

  return (
    <BulkMovePreviewPresentation
      isOpen={isOpen}
      onClose={onClose}
      selectedNodes={selectedNodes}
      currentDestination={destination.currentDestination}
    >
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
    </BulkMovePreviewPresentation>
  );
};
