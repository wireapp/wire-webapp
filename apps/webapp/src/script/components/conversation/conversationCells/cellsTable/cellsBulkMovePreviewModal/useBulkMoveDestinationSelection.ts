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

import {normalizeCellsPath} from './normalizeCellsPath';

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

const getDriveRootPath = (currentPath: string, conversationQualifiedId: QualifiedId): string => {
  const rootPath = currentPath.split('/').filter(Boolean)[0] ?? '';
  return rootPath === `${conversationQualifiedId.id}@${conversationQualifiedId.domain}` ? '' : rootPath;
};

const getParentPath = (path: string): string => {
  return path.split('/').slice(0, -1).join('/');
};

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

const getDestinationPath = (path: string, drivePathPrefix: string, conversationQualifiedId: QualifiedId): string => {
  const normalizedPath = normalizeCellsPath(path, conversationQualifiedId);
  if (normalizedPath.length === 0) {
    return '';
  }

  const normalizedPrefix = drivePathPrefix.replace(/\/+$/, '');
  const relativePath = normalizeDestinationPath(normalizedPath, drivePathPrefix);
  return relativePath.length > 0 ? [normalizedPrefix, relativePath].filter(Boolean).join('/') : normalizedPrefix;
};

export const useBulkMoveDestinationSelection = ({
  isOpen,
  selectedNodes,
  cellsRepository,
  conversationQualifiedId,
}: UseBulkMoveDestinationSelectionProps): BulkMoveDestinationSelection => {
  const {clock, fireAndForgetInvoker, translate} = useApplicationContext();
  const currentRoutePath = getCellsFilesPath();
  const drivePathPrefix = getDriveRootPath(selectedNodes[0]?.path ?? currentRoutePath, conversationQualifiedId);
  const [currentPath, setCurrentPath] = useState(currentRoutePath);
  const [selectedDestinationPath, setSelectedDestinationPath] = useState('');
  const {folders, status, shouldShowLoadingSpinner} = useGetCellsFolders({
    cellsRepository,
    conversationQualifiedId,
    currentPath,
    enabled: isOpen,
    fireAndForgetInvoker,
    clock,
  });

  const normalizedFolders = useMemo(() => {
    return folders.map(folder => {
      return {
        ...folder,
        path: getDestinationPath(folder.path, drivePathPrefix, conversationQualifiedId),
      };
    });
  }, [folders, drivePathPrefix, conversationQualifiedId]);
  const selectedFolderPaths = useMemo(() => {
    return selectedNodes
      .filter(node => {
        return node.type === CellNodeType.FOLDER;
      })
      .map(node => {
        return getDestinationPath(node.path, drivePathPrefix, conversationQualifiedId);
      });
  }, [selectedNodes, drivePathPrefix, conversationQualifiedId]);
  const selectedParentPath = useMemo(() => {
    const parentPaths = selectedNodes.map(node => {
      return getParentPath(normalizeCellsPath(node.path, conversationQualifiedId));
    });
    return parentPaths.every(path => {
      return path === parentPaths[0];
    })
      ? getDestinationPath(parentPaths[0], drivePathPrefix, conversationQualifiedId)
      : null;
  }, [selectedNodes, drivePathPrefix, conversationQualifiedId]);
  const disabledDestinationPaths = useMemo(() => {
    return selectedParentPath === null ? selectedFolderPaths : [...selectedFolderPaths, selectedParentPath];
  }, [selectedFolderPaths, selectedParentPath]);
  const disabledDestinationLabels = useMemo(() => {
    return Object.fromEntries([
      ...selectedFolderPaths.map(path => {
        return [path, translate('cells.bulkMove.selected')];
      }),
      ...(selectedParentPath === null ? [] : [[selectedParentPath, translate('cells.bulkMove.currentLocation')]]),
    ]);
  }, [selectedFolderPaths, selectedParentPath, translate]);

  const handlePathChange = (path: string): void => {
    const destinationPath = getDestinationPath(path, drivePathPrefix, conversationQualifiedId);
    setCurrentPath(destinationPath);
    setSelectedDestinationPath(destinationPath);
  };
  const handleDestinationSelect = (path: string): void => {
    setSelectedDestinationPath(getDestinationPath(path, drivePathPrefix, conversationQualifiedId));
  };

  const driveLabel = translate('cells.bulkMove.drive');
  const relativeDestinationPath = normalizeDestinationPath(selectedDestinationPath, drivePathPrefix);
  const currentDestination =
    relativeDestinationPath.length > 0
      ? `${driveLabel} / ${relativeDestinationPath.split('/').filter(Boolean).join(' / ')}`
      : driveLabel;

  return {
    currentDestination,
    currentPath,
    disabledDestinationLabels,
    disabledDestinationPaths,
    folders: normalizedFolders,
    handleDestinationSelect,
    handlePathChange,
    selectedDestinationPath,
    shouldShowLoadingSpinner,
    status,
  };
};
