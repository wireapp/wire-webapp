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

import {useEffect, useCallback, useMemo, useState} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user/';

import {FireAndForgetInvoker} from '@wireapp/core';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {UserRepository} from 'Repositories/user/userRepository';

import {getUsersFromNodes} from './getUsersFromNodes';
import {transformDataToCellsNodes, transformToCellPagination} from './transformDataToCellsNodes';

import {getCellsApiPath} from '../common/getCellsApiPath/getCellsApiPath';
import {getCellsFilesPath} from '../common/getCellsFilesPath/getCellsFilesPath';
import {RECYCLE_BIN_PATH} from '../common/recycleBin/recycleBin';
import {useCellsStore} from '../common/useCellsStore/useCellsStore';

interface UseGetAllCellsNodesProps {
  cellsRepository: CellsRepository;
  userRepository: UserRepository;
  conversationQualifiedId: QualifiedId;
  enabled: boolean;
  fireAndForgetInvoker: FireAndForgetInvoker;
}

export const useGetAllCellsNodes = ({
  cellsRepository,
  userRepository,
  conversationQualifiedId,
  enabled,
  fireAndForgetInvoker,
}: UseGetAllCellsNodesProps) => {
  const {setNodes, pageSize, setStatus, setPagination, setError, clearAll} = useCellsStore();
  const [offset, setOffset] = useState(0);

  const {domain, id} = conversationQualifiedId;
  const conversationPath = useMemo(() => getCellsApiPath({conversationQualifiedId: {domain, id}}), [domain, id]);

  const fetchNodes = useCallback(async () => {
    try {
      setError(null);
      setStatus('loading');

      const result = await cellsRepository.getAllNodes({
        path: conversationPath,
        limit: pageSize,
        offset,
        deleted: getCellsFilesPath() === RECYCLE_BIN_PATH,
      });

      if (result.Nodes === undefined || result.Nodes.length === 0) {
        setNodes({conversationId: id, nodes: []});
        setStatus('success');
        setPagination({conversationId: id, pagination: null});
        return;
      }

      const users = await getUsersFromNodes({nodes: result.Nodes, userRepository});

      // filter out draft nodes from results
      const filteredNodes = result.Nodes.filter(node => node.IsDraft !== true);

      const transformedNodes = transformDataToCellsNodes({nodes: filteredNodes, users});
      setNodes({conversationId: id, nodes: transformedNodes});

      const pagination = result.Pagination !== undefined ? transformToCellPagination(result.Pagination) : null;
      setPagination({conversationId: id, pagination});

      setStatus('success');
    } catch (error: unknown) {
      setError(error instanceof Error ? error : new Error('Failed to fetch files', {cause: error}));
      setPagination({conversationId: id, pagination: null});
      setStatus('error');
      throw error;
    }
    // cellsRepository and userRepository are not dependencies because they're singletons
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationPath, id, offset, pageSize, setError, setNodes, setPagination, setStatus]);

  const handleHashChange = useCallback((): void => {
    if (enabled !== true) {
      return;
    }
    clearAll({conversationId: id});
    setOffset(0);
    fireAndForgetInvoker.fireAndForget(fetchNodes);
  }, [clearAll, enabled, fetchNodes, fireAndForgetInvoker, id]);

  useEffect(() => {
    if (enabled !== true) {
      return;
    }

    fireAndForgetInvoker.fireAndForget(fetchNodes);
  }, [enabled, fetchNodes, fireAndForgetInvoker]);

  useEffect(() => {
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [handleHashChange]);

  return {
    refresh: fetchNodes,
    setOffset,
  };
};
