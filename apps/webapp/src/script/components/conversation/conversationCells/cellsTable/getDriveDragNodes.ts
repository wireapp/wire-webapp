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

import {normalizeCellsPath} from './cellsBulkMovePreviewModal/normalizeCellsPath';
import {isBulkMoveValid} from './cellsBulkMovePreviewModal/validateBulkMove';

import {QualifiedId} from '../../../../apiClient/user/qualifiedId';
import {CellNode, CellNodeType} from '../../../../types/cellNode';

export const INTERNAL_DRIVE_DRAG_TYPE = 'application/x-wire-drive-nodes';

export interface CapturedDriveDrag {
  nodeIds: string[];
  scopeKey: string;
}

export interface GetDriveDragNodesOptions {
  activeDrag: CapturedDriveDrag | null;
  dataTransferTypes: readonly string[];
  selectedNodeIds: ReadonlySet<string>;
  selectionScopeKey: string;
  canMoveSelection: boolean;
  destination: CellNode;
  nodes: readonly CellNode[];
  conversationQualifiedId: QualifiedId;
}

export const hasSameSelection = (selectedNodeIds: ReadonlySet<string>, nodeIds: readonly string[]): boolean => {
  return (
    selectedNodeIds.size === nodeIds.length &&
    nodeIds.every(nodeId => {
      return selectedNodeIds.has(nodeId);
    })
  );
};

export const getDriveDragNodes = ({
  activeDrag,
  dataTransferTypes,
  selectedNodeIds,
  selectionScopeKey,
  canMoveSelection,
  destination,
  nodes,
  conversationQualifiedId,
}: GetDriveDragNodesOptions): CellNode[] | null => {
  if (
    activeDrag === null ||
    !dataTransferTypes.includes(INTERNAL_DRIVE_DRAG_TYPE) ||
    activeDrag.scopeKey !== selectionScopeKey ||
    !hasSameSelection(selectedNodeIds, activeDrag.nodeIds) ||
    !canMoveSelection ||
    destination.type !== CellNodeType.FOLDER ||
    activeDrag.nodeIds.includes(destination.id)
  ) {
    return null;
  }

  const selected = nodes.filter(node => {
    return activeDrag.nodeIds.includes(node.id);
  });
  const destinationPath = normalizeCellsPath(destination.path, conversationQualifiedId);
  const selectedPaths = selected.map(node => {
    return normalizeCellsPath(node.path, conversationQualifiedId);
  });
  const parentPaths = selectedPaths.map(path => {
    return path.split('/').slice(0, -1).join('/');
  });
  if (
    selected.length !== activeDrag.nodeIds.length ||
    parentPaths.every(path => {
      return path === destinationPath;
    }) ||
    !isBulkMoveValid({
      conversationQualifiedId,
      destinationPath,
      selectedNodes: selected.map((node, index) => {
        return {...node, path: selectedPaths[index]};
      }),
    })
  ) {
    return null;
  }

  return selected;
};
