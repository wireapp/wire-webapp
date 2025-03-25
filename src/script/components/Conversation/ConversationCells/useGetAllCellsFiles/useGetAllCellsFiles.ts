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

import {useEffect, useCallback} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user/';

import {CellsRepository} from 'src/script/cells/CellsRepository';
import {Config} from 'src/script/Config';

import {transformNodesToCellsFiles} from './transformNodesToCellsFiles';

import {useCellsStore} from '../common/useCellsStore/useCellsStore';

interface UseGetAllCellsFilesProps {
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
}

export const useGetAllCellsFiles = ({cellsRepository, conversationQualifiedId}: UseGetAllCellsFilesProps) => {
  const {setFiles, setStatus, setError} = useCellsStore();

  const fetchFiles = useCallback(async () => {
    try {
      setStatus('loading');

      const {domain, id} = conversationQualifiedId;

      // Temporary solution to handle the local development
      // TODO: remove this once we have a proper way to handle the domain per env
      const domainPerEnv = process.env.NODE_ENV === 'development' ? Config.getConfig().CELLS_WIRE_DOMAIN : domain;

      const result = await cellsRepository.getAllFiles({
        path: `${id}@${domainPerEnv}`,
      });

      if (!result.Nodes) {
        throw new Error('No files found');
      }

      const transformedFiles = transformNodesToCellsFiles(result.Nodes);
      setFiles(transformedFiles);
      setStatus('success');
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to fetch files', {cause: error}));
      setStatus('error');
      throw error;
    }
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setFiles, setStatus, setError]);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  return {
    refresh: fetchFiles,
  };
};
