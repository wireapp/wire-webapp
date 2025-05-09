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
import {Config} from 'src/script/Config';

import {transformNodesToCellsFiles, transformToCellPagination} from './transformNodesToCellsFiles';

import {getCellsFilesPath} from '../common/getCellsFilesPath/getCellsFilesPath';
import {useCellsStore} from '../common/useCellsStore/useCellsStore';

interface UseGetAllCellsFilesProps {
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
}

export const useGetAllCellsFiles = ({cellsRepository, conversationQualifiedId}: UseGetAllCellsFilesProps) => {
  const {setFiles, pageSize, setStatus, setPagination, setError} = useCellsStore();
  const [offset, setOffset] = useState(0);

  const {domain, id} = conversationQualifiedId;

  const fetchFiles = useCallback(async () => {
    try {
      setStatus('loading');

      // Temporary solution to handle the local development
      // TODO: remove this once we have a proper way to handle the domain per env
      const domainPerEnv = process.env.NODE_ENV === 'development' ? Config.getConfig().CELLS_WIRE_DOMAIN : domain;

      const currentPath = getCellsFilesPath();

      const result = await cellsRepository.getAllFiles({
        path: `${id}@${domainPerEnv}${currentPath ? `/${currentPath}` : ''}`,
        limit: pageSize,
        offset,
      });

      if (!result.Nodes?.length) {
        setStatus('success');
        setPagination({conversationId: id, pagination: null});
        return;
      }

      const transformedFiles = transformNodesToCellsFiles(result.Nodes);
      setFiles({conversationId: id, files: transformedFiles});

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
  }, [setFiles, setStatus, setError, id, domain, offset, pageSize, setPagination]);

  const handleHashChange = useCallback(() => {
    setOffset(0);
    void fetchFiles();
  }, [fetchFiles, setOffset]);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [handleHashChange]);

  return {
    refresh: fetchFiles,
    setOffset,
  };
};
