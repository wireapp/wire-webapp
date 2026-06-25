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

import {PrimaryModal} from 'Components/modals/primaryModal';
import type {RootContextValue} from 'src/script/page/rootProvider';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';
import {replaceReactComponents} from 'Util/localizerUtil/reactLocalizerUtil';

export const showRestoreRootNodeModal = ({
  node,
  onRestoreNode,
  translate,
}: {
  node: CellNode;
  onRestoreNode: () => void;
  translate: RootContextValue['translate'];
}) => {
  PrimaryModal.show(
    PrimaryModal.type.CONFIRM,
    {
      primaryAction: {
        action: onRestoreNode,
        text: translate('cells.restoreRootNodeModal.button'),
      },
      text: {
        message: replaceReactComponents(
          translate(
            node.type === CellNodeType.FILE
              ? 'cells.restoreRootNodeModal.file.description'
              : 'cells.restoreRootNodeModal.folder.description',
            {
              name: '{name}',
            },
          ),
          [
            {
              exactMatch: '{name}',
              render: () => <b>{node.name}</b>,
            },
          ],
        ),
        title:
          node.type === CellNodeType.FILE
            ? translate('cells.restoreRootNodeModal.file.headline')
            : translate('cells.restoreRootNodeModal.folder.headline'),
      },
    },
    undefined,
    translate,
  );
};
