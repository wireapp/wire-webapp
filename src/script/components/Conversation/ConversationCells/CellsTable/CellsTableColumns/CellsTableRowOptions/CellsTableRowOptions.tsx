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

import {useCallback, useState} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {DropdownMenu, MoreIcon} from '@wireapp/react-ui-kit';

import {useAppNotification} from 'Components/AppNotification/AppNotification';
import {CellNode} from 'Components/Conversation/ConversationCells/common/cellNode/cellNode';
import {openFolder} from 'Components/Conversation/ConversationCells/common/openFolder/openFolder';
import {
  isInRecycleBin,
  isRootRecycleBinPath,
} from 'Components/Conversation/ConversationCells/common/recycleBin/recycleBin';
import {useCellsStore} from 'Components/Conversation/ConversationCells/common/useCellsStore/useCellsStore';
import {CellsRepository} from 'src/script/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';
import {forcedDownloadFile} from 'Util/util';

import {CellsMoveNodeModal} from './CellsMoveNodeModal/CellsMoveNodeModal';
import {buttonStyles, iconStyles, textStyles} from './CellsTableRowOptions.styles';
import {showDeletePermanentlyModal} from './showDeletePermanentlyModal/showDeletePermanentlyModal';
import {showMoveToRecycleBinModal} from './showMoveToRecycleBinModal/showMoveToRecycleBinModal';
import {showRestoreNodeModal} from './showRestoreNodeModal/showRestoreNodeModal';

import {useCellsFilePreviewModal} from '../../common/CellsFilePreviewModalContext/CellsFilePreviewModalContext';
import {showShareFileModal} from '../CellsNodeShareModal/CellsNodeShareModal';

interface CellsTableRowOptionsProps {
  node: CellNode;
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  conversationName: string;
}

export const CellsTableRowOptions = ({
  node,
  cellsRepository,
  conversationQualifiedId,
  conversationName,
}: CellsTableRowOptionsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <button css={buttonStyles} aria-label={t('cellsGlobalView.optionsLabel')}>
          <MoreIcon css={iconStyles} />
          <span css={textStyles}>{t('cellsGlobalView.optionsLabel')}</span>
        </button>
      </DropdownMenu.Trigger>
      <CellsTableRowOptionsContent
        node={node}
        cellsRepository={cellsRepository}
        conversationQualifiedId={conversationQualifiedId}
        conversationName={conversationName}
      />
    </DropdownMenu>
  );
};

const CellsTableRowOptionsContent = ({
  node,
  cellsRepository,
  conversationQualifiedId,
  conversationName,
}: CellsTableRowOptionsProps) => {
  const {handleOpenFile} = useCellsFilePreviewModal();
  const {removeNode} = useCellsStore();
  const [isMoveNodeModalOpen, setIsMoveNodeModalOpen] = useState(false);

  const url = node.url;
  const name = node.type === 'folder' ? `${node.name}.zip` : node.name;
  const conversationId = conversationQualifiedId.id;

  const deleteFileFailedNotification = useAppNotification({
    message: t('cellsGlobalView.deleteModalError'),
  });

  const handleDeleteNode = useCallback(
    async ({uuid, permanently = false}: {uuid: string; permanently?: boolean}) => {
      try {
        removeNode({conversationId, nodeId: uuid});
        await cellsRepository.deleteNode({uuid, permanently});
      } catch (error) {
        deleteFileFailedNotification.show();
        console.error(error);
      }
    },
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationId, removeNode, deleteFileFailedNotification],
  );

  const restoreNodeFailedNotification = useAppNotification({
    message: t('cellsRestoreError'),
  });

  const handleRestoreNode = useCallback(
    async ({uuid}: {uuid: string}) => {
      try {
        removeNode({conversationId, nodeId: uuid});
        await cellsRepository.restoreNode({uuid});
      } catch (error) {
        restoreNodeFailedNotification.show();
        console.error(error);
      }
    },
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationId, removeNode, restoreNodeFailedNotification],
  );

  if (isRootRecycleBinPath()) {
    return (
      <DropdownMenu.Content>
        <DropdownMenu.Item
          onClick={() =>
            showRestoreNodeModal({
              node,
              onRestoreNode: () => handleRestoreNode({uuid: node.id}),
            })
          }
        >
          {t('cellsGlobalView.optionRestore')}
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onClick={() =>
            showDeletePermanentlyModal({
              node,
              onDeletePermanently: () => handleDeleteNode({uuid: node.id, permanently: true}),
            })
          }
        >
          {t('cellsGlobalView.optionDeletePermanently')}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    );
  }

  if (isInRecycleBin()) {
    return (
      <DropdownMenu.Content>
        <DropdownMenu.Item
          onClick={() =>
            showDeletePermanentlyModal({
              node,
              onDeletePermanently: () => handleDeleteNode({uuid: node.id, permanently: true}),
            })
          }
        >
          {t('cellsGlobalView.optionDeletePermanently')}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    );
  }

  return (
    <>
      <DropdownMenu.Content>
        <DropdownMenu.Item onClick={() => setIsMoveNodeModalOpen(true)}>
          {t('cellsGlobalView.optionMove')}
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onClick={() =>
            showShareFileModal({uuid: node.id, conversationId: conversationQualifiedId.id, cellsRepository})
          }
        >
          {t('cellsGlobalView.optionShare')}
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onClick={() =>
            node.type === 'folder' ? openFolder({conversationQualifiedId, name: node.name}) : handleOpenFile(node)
          }
        >
          {t('cellsGlobalView.optionOpen')}
        </DropdownMenu.Item>
        {url && (
          <DropdownMenu.Item onClick={() => forcedDownloadFile({url, name})}>
            {t('cellsGlobalView.optionDownload')}
          </DropdownMenu.Item>
        )}
        <DropdownMenu.Item
          onClick={() =>
            showMoveToRecycleBinModal({
              node,
              onMoveToRecycleBin: () => handleDeleteNode({uuid: node.id, permanently: false}),
            })
          }
        >
          {t('cellsGlobalView.optionDelete')}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
      <CellsMoveNodeModal
        nodeToMove={node}
        isOpen={isMoveNodeModalOpen}
        onClose={() => setIsMoveNodeModalOpen(false)}
        cellsRepository={cellsRepository}
        conversationQualifiedId={conversationQualifiedId}
        conversationName={conversationName}
      />
    </>
  );
};
