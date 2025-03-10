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

import {RestNode} from 'cells-sdk-ts';

import {CellsRepository} from 'src/script/cells/CellsRepository';

import {useCellsStore} from '../useCellsStore';

interface UseGetCellsFilesProps {
  cellsRepository: CellsRepository;
}

interface PublicLink {
  uuid: string;
  url: string;
}

interface File {
  id: string;
  mimeType: string;
  name: string;
  sizeMb: string;
  previewUrl: string;
  uploadedAt: string;
  publicLink?: PublicLink;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export const useGetCellsFiles = ({cellsRepository}: UseGetCellsFilesProps) => {
  const {setFiles, setStatus, setError} = useCellsStore();

  const fetchFiles = useCallback(async () => {
    try {
      setStatus('loading');

      const result = await cellsRepository.getAllFiles();

      if (!result.Nodes) {
        throw new Error('No files found');
      }

      const transformedFiles = transformNodesToFiles(result.Nodes);
      setFiles(transformedFiles);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch files', {cause: err}));
      setStatus('error');
    }
  }, [setFiles, setStatus, setError]);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  return {
    refresh: fetchFiles,
  };
};

const transformNodesToFiles = (nodes: RestNode[]) => {
  return nodes
    .filter(node => node.Type === 'LEAF')
    .map(node => ({
      id: node.Uuid,
      mimeType: node.ContentType || '',
      name: node.Path,
      sizeMb: node.Size || '',
      previewUrl: node.Previews?.[0]?.Url || '',
      uploadedAt: node.Modified || '',
    }));
};
