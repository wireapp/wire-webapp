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

import {getCellsFilesPath} from 'Components/conversation/conversationCells/common/getCellsFilesPath/getCellsFilesPath';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';

import {useGetCellsFolders} from '../cellsTableColumns/cellsTableRowOptions/cellsMoveNodeModal/useGetCellsFolders/useGetCellsFolders';

interface UseBulkMoveDestinationSelectionProps {
  isOpen: boolean;
  selectedNodes: CellNode[];
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
}

export interface BulkMoveDestinationSelection {
  currentDestination: string;
  currentPath: string;
  disabledDestinationLabels: Readonly<Record<string, string>>;
  disabledDestinationPaths: readonly string[];
  folders: {id: string; name: string; path: string}[];
  handleDestinationSelect: (path: string) => void;
  handlePathChange: (path: string) => void;
  selectedDestinationPath: string;
  shouldShowLoadingSpinner: boolean;
  status: 'idle' | 'loading' | 'success' | 'error';
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

export const useBulkMoveDestinationSelection = ({
  isOpen,
  selectedNodes,
  cellsRepository,
  conversationQualifiedId,
}: UseBulkMoveDestinationSelectionProps): BulkMoveDestinationSelection => {
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
