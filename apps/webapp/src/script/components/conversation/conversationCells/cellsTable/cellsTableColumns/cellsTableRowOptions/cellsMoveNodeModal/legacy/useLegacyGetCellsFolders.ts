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

import {useCallback, useEffect, useState} from 'react';

import type {Clock} from '@enormora/clock/clock';
import type {FireAndForgetInvoker} from '@enormora/fire-and-forget';
import {QualifiedId} from '@wireapp/api-client/lib/user/';
import {task} from 'true-myth';

import {getCellsApiPath} from 'Components/conversation/conversationCells/common/getCellsApiPath/getCellsApiPath';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {CellNode} from 'src/script/types/cellNode';

import {transformNodesToCellsFolders} from '../useGetCellsFolders/transformNodesToCellsFolders';

interface UseLegacyGetCellsFoldersProps {
  currentPath: string;
  nodeToMove: CellNode;
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  enabled: boolean;
  fireAndForgetInvoker: FireAndForgetInvoker;
  clock: Clock;
}

type Status = 'idle' | 'loading' | 'success' | 'error';
interface Folder {
  id: string;
  name: string;
  path: string;
}

const SHOW_LOADING_SPINNER_DELAY_MS = 1000;

type UseLegacyGetCellsFoldersResult = {
  refresh: () => Promise<void>;
  folders: Folder[];
  status: Status;
  shouldShowLoadingSpinner: boolean;
};
export const useLegacyGetCellsFolders = ({
  nodeToMove,
  cellsRepository,
  conversationQualifiedId,
  currentPath,
  enabled,
  fireAndForgetInvoker,
  clock,
}: UseLegacyGetCellsFoldersProps): UseLegacyGetCellsFoldersResult => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [shouldShowLoadingSpinner, setShouldShowLoadingSpinner] = useState(true);

  const fetchFolders = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setStatus('loading');
    const foldersResult = await task.tryOrElse(
      error => {
        return error;
      },
      () => {
        return cellsRepository.getAllNodes({
          path: getCellsApiPath({conversationQualifiedId, currentPath}),
          type: 'folder',
        });
      },
    );

    if (foldersResult.isErr) {
      setFolders([]);
      setStatus('error');
      return;
    }

    const nodes = foldersResult.value.Nodes;
    if (nodes === undefined || nodes.length === 0) {
      setStatus('success');
      setFolders([]);
      return;
    }

    const transformedFolders = transformNodesToCellsFolders(nodes);
    setFolders(
      transformedFolders.filter(folder => {
        return folder.path !== nodeToMove.path;
      }),
    );
    setStatus('success');
    // cellsRepository is a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationQualifiedId, enabled, currentPath, nodeToMove]);

  useEffect(() => {
    fireAndForgetInvoker.fireAndForget(fetchFolders);
  }, [fetchFolders, fireAndForgetInvoker]);

  useEffect(() => {
    if (!['loading', 'idle'].includes(status)) {
      setShouldShowLoadingSpinner(false);
      return undefined;
    }

    const timeout = clock.setTimeout(() => {
      setShouldShowLoadingSpinner(true);
    }, SHOW_LOADING_SPINNER_DELAY_MS);

    return () => {
      clock.clearTimeout(timeout);
    };
  }, [status, clock]);

  return {refresh: fetchFolders, folders, status, shouldShowLoadingSpinner};
};
