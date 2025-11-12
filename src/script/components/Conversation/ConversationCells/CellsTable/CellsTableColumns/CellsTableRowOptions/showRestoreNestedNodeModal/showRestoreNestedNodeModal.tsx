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

import {CellNode} from 'Components/Conversation/ConversationCells/common/cellNode/cellNode';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {t} from 'Util/LocalizerUtil';
import {replaceReactComponents} from 'Util/LocalizerUtil/ReactLocalizerUtil';

import {modalContentStyles} from './showRestoreNestedNodeModal.styles';

export const showRestoreNestedNodeModal = ({
  node,
  onRestoreNode,
  parentNodeName,
}: {
  node: CellNode;
  onRestoreNode: () => void;
  parentNodeName: string;
}) => {
  PrimaryModal.show(PrimaryModal.type.CONFIRM, {
    size: 'large',
    primaryAction: {
      action: onRestoreNode,
      text: t('cells.restoreNestedNodeModal.button'),
    },
    text: {
      message: (
        <div css={modalContentStyles}>
          <p>{t('cells.restoreNestedNodeModal.description1')}</p>
          <p>
            {replaceReactComponents(
              t('cells.restoreNestedNodeModal.description2', {
                name: '{name}',
              }),
              [
                {
                  exactMatch: '{name}',
                  render: () => <b>{parentNodeName}</b>,
                },
              ],
            )}
          </p>
        </div>
      ),
      title:
        node.type === 'file'
          ? t('cells.restoreNestedNodeModal.file.headline')
          : t('cells.restoreNestedNodeModal.folder.headline'),
    },
  });
};
