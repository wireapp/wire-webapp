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

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';
import {t} from 'Util/LocalizerUtil';
import {replaceReactComponents} from 'Util/LocalizerUtil/ReactLocalizerUtil';

export const showRestoreRootNodeModal = ({node, onRestoreNode}: {node: CellNode; onRestoreNode: () => void}) => {
  PrimaryModal.show(PrimaryModal.type.CONFIRM, {
    primaryAction: {
      action: onRestoreNode,
      text: t('cells.restoreRootNodeModal.button'),
    },
    text: {
      message: replaceReactComponents(
        t(
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
          ? t('cells.restoreRootNodeModal.file.headline')
          : t('cells.restoreRootNodeModal.folder.headline'),
    },
  });
};
