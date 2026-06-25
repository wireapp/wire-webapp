/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useCallback, useEffect, useState} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user/';

import {FireAndForgetInvoker} from '@wireapp/core';

import {getCellsApiPath} from 'Components/conversation/conversationcells/common/getcellsapipath/getcellsapipath';
import {CellsRepository} from 'Repositories/cells/cellsrepository';
import {CellNode} from 'src/script/types/cellNode';

import {transformNodesToCellsFolders} from './transformnodestocellsfolders';

interface UseGetCellsFoldersProps {
  currentPath: string;
  nodeToMove: CellNode;
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  enabled: boolean;
  fireAndForgetInvoker: FireAndForgetInvoker;
}

type Status = 'idle' | 'loading' | 'success' | 'error';
interface Folder {
  id: string;
  name: string;
  path: string;
}

const SHOW_LOADING_SPINNER_DELAY_MS = 1000;

export const useGetCellsFolders = ({
  nodeToMove,
  cellsRepository,
  conversationQualifiedId,
  currentPath,
  enabled,
  fireAndForgetInvoker,
}: UseGetCellsFoldersProps) => {
  const [folders, setFolders] = useState<Array<Folder>>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [shouldShowLoadingSpinner, setShouldShowLoadingSpinner] = useState(true);

  const fetchFolders = useCallback(async () => {
    if (!enabled) {
      return;
    }

    try {
      setStatus('loading');

      const result = await cellsRepository.getAllNodes({
        path: getCellsApiPath({conversationQualifiedId, currentPath}),
        type: 'folder',
      });

      if (result.Nodes === undefined || result.Nodes.length === 0) {
        setStatus('success');
        setFolders([]);
        return;
      }

      const transformedFolders = transformNodesToCellsFolders(result.Nodes);
      const filteredFolders = transformedFolders.filter(folder => folder.path !== nodeToMove.path);

      setFolders(filteredFolders);
      setStatus('success');
    } catch (error: unknown) {
      setFolders([]);
      setStatus('error');
      throw error;
    }
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setFolders, setStatus, conversationQualifiedId, enabled, currentPath, nodeToMove]);

  useEffect(() => {
    fireAndForgetInvoker.fireAndForget(fetchFolders);
  }, [fetchFolders, fireAndForgetInvoker]);

  useEffect(() => {
    if (!['loading', 'idle'].includes(status)) {
      setShouldShowLoadingSpinner(false);
      return undefined;
    }

    const timeout = setTimeout(() => {
      setShouldShowLoadingSpinner(true);
    }, SHOW_LOADING_SPINNER_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [status]);

  return {
    refresh: fetchFolders,
    folders,
    status,
    shouldShowLoadingSpinner,
  };
};
