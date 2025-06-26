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

import {useEffect, useCallback, useState} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user/';

import {CellsRepository} from 'src/script/cells/CellsRepository';

import {transformDataToCellsNodes, transformToCellPagination} from './transformDataToCellsNodes';

import {getCellsApiPath} from '../common/getCellsApiPath/getCellsApiPath';
import {useCellsStore} from '../common/useCellsStore/useCellsStore';

interface UseGetAllCellsNodesProps {
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  enabled: boolean;
}

export const useGetAllCellsNodes = ({cellsRepository, conversationQualifiedId, enabled}: UseGetAllCellsNodesProps) => {
  const {setNodes, pageSize, setStatus, setPagination, setError, clearAll} = useCellsStore();
  const [offset, setOffset] = useState(0);

  const {id} = conversationQualifiedId;

  const fetchNodes = useCallback(async () => {
    try {
      setStatus('loading');

      const result = await cellsRepository.getAllNodes({
        path: getCellsApiPath({conversationQualifiedId}),
        limit: pageSize,
        offset,
      });

      if (!result.Nodes?.length) {
        setStatus('success');
        setPagination({conversationId: id, pagination: null});
        return;
      }

      const transformedNodes = transformDataToCellsNodes(result.Nodes);
      setNodes({conversationId: id, nodes: transformedNodes});

      const pagination = result.Pagination ? transformToCellPagination(result.Pagination) : null;
      setPagination({conversationId: id, pagination});

      setStatus('success');
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to fetch files', {cause: error}));
      setPagination({conversationId: id, pagination: null});
      setStatus('error');
      throw error;
    }
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setNodes, setStatus, setError, id, offset, pageSize, setPagination]);

  const handleHashChange = useCallback(() => {
    clearAll({conversationId: id});
    setOffset(0);
    void fetchNodes();
  }, [fetchNodes, setOffset, clearAll, id]);

  useEffect(() => {
    if (enabled) {
      void fetchNodes();
    }
  }, [fetchNodes, enabled]);

  useEffect(() => {
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [handleHashChange]);

  return {
    refresh: fetchNodes,
    setOffset,
  };
};
