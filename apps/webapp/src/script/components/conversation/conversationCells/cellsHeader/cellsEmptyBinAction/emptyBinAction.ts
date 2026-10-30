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

import {isNonEmptyString} from '@sindresorhus/is';
import type {QualifiedId} from '@wireapp/api-client/lib/user/';
import {TreeNodeType, type RestPerformActionResponse} from 'cells-sdk-ts';

import type {CellsRepository} from 'Repositories/cells/cellsRepository';

import {getCellsApiPath} from '../../common/getCellsApiPath/getCellsApiPath';
import {RECYCLE_BIN_PATH} from '../../common/recycleBin/recycleBin';

export const isEmptyBinRootPath = (currentPath: string): boolean => {
  return currentPath === RECYCLE_BIN_PATH;
};

export const getRecycleBinNodePath = (conversationQualifiedId: QualifiedId): string => {
  const workspacePath = getCellsApiPath({conversationQualifiedId, currentPath: ''});
  return `${workspacePath}/${RECYCLE_BIN_PATH}`;
};

export const emptyBin = async ({
  cellsRepository,
  conversationQualifiedId,
  onDeleteStarted,
}: {
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  onDeleteStarted?: () => void;
}): Promise<RestPerformActionResponse> => {
  const binNodePath = getRecycleBinNodePath(conversationQualifiedId);
  const binNode = await cellsRepository.lookupNodeByPath({path: binNodePath});

  if (binNode === undefined || binNode.Type !== TreeNodeType.Collection || !isNonEmptyString(binNode.Uuid)) {
    throw new Error('The current Shared Drive Bin folder could not be resolved.');
  }

  onDeleteStarted?.();
  return cellsRepository.deleteNodes({uuids: [binNode.Uuid], permanently: true});
};
