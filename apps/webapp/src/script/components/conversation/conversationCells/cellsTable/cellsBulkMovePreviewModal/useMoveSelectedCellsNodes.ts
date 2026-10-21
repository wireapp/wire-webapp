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

import {useRef, useState} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user/';
import {RestPerformActionResponse} from 'cells-sdk-ts';
import {Result, result, task} from 'true-myth';

import {
  CELLS_ACTION,
  canPerformCellsAction,
  useCellsActionPermissions,
} from 'Components/conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {getCellsApiPath} from 'Components/conversation/conversationCells/common/getCellsApiPath/getCellsApiPath';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {CellNode} from 'src/script/types/cellNode';

import {isBulkMoveValid} from './validateBulkMove';

interface UseMoveSelectedCellsNodesProps {
  conversationQualifiedId: QualifiedId;
  destinationPath: string;
  selectedNodes: CellNode[];
  cellsRepository: CellsRepository;
}

export const useMoveSelectedCellsNodes = ({
  conversationQualifiedId,
  destinationPath,
  selectedNodes,
  cellsRepository,
}: UseMoveSelectedCellsNodesProps): {
  isSubmitting: boolean;
  isValid: boolean;
  submitMove: () => Promise<Result<RestPerformActionResponse, unknown>>;
} => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const canPerformCurrentDriveAction = useCellsActionPermissions();
  const canMove =
    canPerformCurrentDriveAction(CELLS_ACTION.MOVE) &&
    selectedNodes.every(node => {
      return canPerformCellsAction({action: CELLS_ACTION.MOVE, selfUserDriveRole: node.selfUserDriveRole});
    });
  const isValid = canMove && isBulkMoveValid({conversationQualifiedId, destinationPath, selectedNodes});

  const submitMove = async (): Promise<Result<RestPerformActionResponse, unknown>> => {
    if (isSubmittingRef.current) {
      return result.err(new Error('A bulk move is already in progress'));
    }

    if (!isValid) {
      return result.err(new Error('The selected items or destination cannot be moved'));
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const moveResult = await task.tryOrElse(
      error => {
        return error;
      },
      () => {
        return cellsRepository.moveNodes({
          currentPaths: selectedNodes.map(node => {
            return node.path;
          }),
          targetPath: getCellsApiPath({conversationQualifiedId, currentPath: destinationPath}),
        });
      },
    );
    isSubmittingRef.current = false;
    setIsSubmitting(false);

    return moveResult;
  };

  return {isSubmitting, isValid, submitMove};
};
