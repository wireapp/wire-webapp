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

import type {RestoreTarget} from './resolveRestoreTargets';

import type {RootContextValue} from '../../../../../page/rootProvider';
import type {CellNode} from '../../../../../types/cellNode';
import {PrimaryModal} from '../../../../Modals/PrimaryModal';
import {showRestoreNestedNodeModal} from '../cellsTableColumns/cellsTableRowOptions/showRestoreNestedNodeModal/showRestoreNestedNodeModal';
import {showRestoreRootNodeModal} from '../cellsTableColumns/cellsTableRowOptions/showRestoreRootNodeModal/showRestoreRootNodeModal';

interface ShowBulkRestoreModalParams {
  selectedNodes: readonly CellNode[];
  targets: readonly RestoreTarget[];
  onRestore: () => void;
  modalId: string;
  translate: RootContextValue['translate'];
}

/**
 * A single selected item keeps the existing single-item restore dialogs. Several items get one generic
 * dialog; when a deleted parent must also be restored, it uses the existing nested-restore explanation.
 */
export const showBulkRestoreModal = ({
  selectedNodes,
  targets,
  onRestore,
  modalId,
  translate,
}: ShowBulkRestoreModalParams): void => {
  const parentNames = targets.flatMap(target => {
    return target.kind === 'parent' ? [target.rootParentName] : [];
  });
  const [firstNode] = selectedNodes;

  if (selectedNodes.length === 1 && firstNode !== undefined) {
    if (parentNames.length > 0) {
      showRestoreNestedNodeModal({
        node: firstNode,
        onRestoreNode: onRestore,
        parentNodeName: parentNames[0],
        modalId,
        translate,
      });
      return;
    }
    showRestoreRootNodeModal({node: firstNode, onRestoreNode: onRestore, modalId, translate});
    return;
  }

  const hasParentRestore = parentNames.length > 0;
  PrimaryModal.show(
    PrimaryModal.type.CONFIRM,
    {
      primaryAction: {
        action: onRestore,
        text: translate(hasParentRestore ? 'cells.restoreNestedNodeModal.button' : 'cells.options.restore'),
      },
      text: {
        message: hasParentRestore
          ? `${translate('cells.restoreNestedNodeModal.description1')} ${translate('cells.restoreNestedNodeModal.description2', {name: parentNames.join(', ')})}`
          : translate('cells.bulkRestore.confirmation.multiple', {count: selectedNodes.length}),
        title: translate('cells.bulkRestore.confirmation.title'),
      },
    },
    modalId,
    translate,
  );
};
