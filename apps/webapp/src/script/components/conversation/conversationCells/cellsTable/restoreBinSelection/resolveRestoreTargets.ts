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

import {
  CELLS_ACTION,
  canPerformCellsAction,
} from 'Components/conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {RECYCLE_BIN_PATH} from 'Components/conversation/conversationCells/common/recycleBin/recycleBin';
import {CellNode} from 'src/script/types/cellNode';

export type RestoreTarget =
  {kind: 'selected'; node: CellNode} | {kind: 'parent'; rootParentName: string; selectedNodes: CellNode[]};

export interface ResolvedRestoreTargets {
  targets: RestoreTarget[];
  hasParentRestore: boolean;
  canRestore: boolean;
}

interface ResolveRestoreTargetsParams {
  selectedNodes: readonly CellNode[];
}

const getSegmentsBelowRecycleBin = (nodePath: string): string[] => {
  const segments = nodePath.split('/');
  const recycleBinIndex = segments.indexOf(RECYCLE_BIN_PATH);
  return recycleBinIndex === -1 ? [] : segments.slice(recycleBinIndex + 1);
};

const canRestoreNode = (node: CellNode): boolean => {
  return canPerformCellsAction({action: CELLS_ACTION.RESTORE, selfUserDriveRole: node.selfUserDriveRole});
};

/**
 * Restoring an item nested in a deleted folder restores the deleted root parent, not only the item.
 * This maps a selection to the nodes that will actually be restored: selected roots as themselves,
 * and one parent target per deleted root parent that is not itself selected.
 */
export const resolveRestoreTargets = ({selectedNodes}: ResolveRestoreTargetsParams): ResolvedRestoreTargets => {
  const selectedRootNames = new Set<string>();
  const nestedNodesByRootName = new Map<string, CellNode[]>();
  const targets: RestoreTarget[] = [];
  let isEverySelectedNodeInBin = true;

  for (const node of selectedNodes) {
    const [rootName, ...nestedSegments] = getSegmentsBelowRecycleBin(node.path);
    if (rootName === undefined) {
      isEverySelectedNodeInBin = false;
      continue;
    }

    if (nestedSegments.length === 0) {
      selectedRootNames.add(rootName);
      targets.push({kind: 'selected', node});
      continue;
    }

    nestedNodesByRootName.set(rootName, [...(nestedNodesByRootName.get(rootName) ?? []), node]);
  }

  for (const [rootParentName, nodes] of nestedNodesByRootName) {
    if (!selectedRootNames.has(rootParentName)) {
      targets.push({kind: 'parent', rootParentName, selectedNodes: nodes});
    }
  }

  const hasParentRestore = targets.some(target => {
    return target.kind === 'parent';
  });
  const canRestore =
    selectedNodes.length > 0 &&
    isEverySelectedNodeInBin &&
    selectedNodes.every(node => {
      return canRestoreNode(node);
    });

  return {targets, hasParentRestore, canRestore};
};
