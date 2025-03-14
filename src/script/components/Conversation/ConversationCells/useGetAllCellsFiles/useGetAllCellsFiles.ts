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

import {CellsRepository} from 'src/script/cells/CellsRepository';
import {Config} from 'src/script/Config';

import {transformNodesToCellsFiles} from './transformNodesToCellsFiles';

import {useCellsStore} from '../common/useCellsStore/useCellsStore';

interface UseGetAllCellsFilesProps {
  cellsRepository: CellsRepository;
  conversationId: string;
}

export const useGetAllCellsFiles = ({cellsRepository, conversationId}: UseGetAllCellsFilesProps) => {
  const {setFiles, setStatus, setError} = useCellsStore();

  const fetchFiles = useCallback(async () => {
    try {
      setStatus('loading');

      const result = await cellsRepository.getAllFiles({
        path: `${conversationId}@${Config.getConfig().CELLS_WIRE_DOMAIN}`,
      });

      if (!result.Nodes) {
        throw new Error('No files found');
      }

      const transformedFiles = transformNodesToCellsFiles(result.Nodes);
      setFiles(transformedFiles);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch files', {cause: err}));
      setStatus('error');
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
