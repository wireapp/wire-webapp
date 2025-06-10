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
import {CellsTagsModal} from './CellsTagsModal/CellsTagsModal';
import {showDeletePermanentlyModal} from './showDeletePermanentlyModal/showDeletePermanentlyModal';
import {showMoveToRecycleBinModal} from './showMoveToRecycleBinModal/showMoveToRecycleBinModal';
import {showRestoreNodeModal} from './showRestoreNodeModal/showRestoreNodeModal';

import {useCellsFilePreviewModal} from '../../common/CellsFilePreviewModalContext/CellsFilePreviewModalContext';
import {showShareModal} from '../CellsNodeShareModal/CellsNodeShareModal';

interface CellsTableRowOptionsProps {
  node: CellNode;
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  conversationName: string;
  onRefresh: () => void;
}

export const CellsTableRowOptions = ({
  node,
  cellsRepository,
  conversationQualifiedId,
  conversationName,
  onRefresh,
}: CellsTableRowOptionsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <button css={buttonStyles} aria-label={t('cells.options.label')}>
          <MoreIcon css={iconStyles} />
          <span css={textStyles}>{t('cells.options.label')}</span>
        </button>
      </DropdownMenu.Trigger>
      <CellsTableRowOptionsContent
        node={node}
        cellsRepository={cellsRepository}
        conversationQualifiedId={conversationQualifiedId}
        conversationName={conversationName}
        onRefresh={onRefresh}
      />
    </DropdownMenu>
  );
};

const CellsTableRowOptionsContent = ({
  node,
  cellsRepository,
  conversationQualifiedId,
  conversationName,
  onRefresh,
}: CellsTableRowOptionsProps) => {
  const {handleOpenFile} = useCellsFilePreviewModal();
  const {removeNode} = useCellsStore();
  const [isMoveNodeModalOpen, setIsMoveNodeModalOpen] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const url = node.url;
  const name = node.type === 'folder' ? `${node.name}.zip` : node.name;
  const conversationId = conversationQualifiedId.id;

  const deleteFileFailedNotification = useAppNotification({
    message: t('cells.deleteModal.error'),
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
    message: t('cells.restore.error'),
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

  const handleRenameNode = async () => {
    await cellsRepository.renameNode({currentPath: node.path, newName: 'renamed-sss.txt'});
  };

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
          {t('cells.options.restore')}
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onClick={() =>
            showDeletePermanentlyModal({
              node,
              onDeletePermanently: () => handleDeleteNode({uuid: node.id, permanently: true}),
            })
          }
        >
          {t('cells.options.deletePermanently')}
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
          {t('cells.options.deletePermanently')}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    );
  }

  return (
    <>
      <DropdownMenu.Content>
        <DropdownMenu.Item onClick={() => setIsMoveNodeModalOpen(true)}>{t('cells.options.move')}</DropdownMenu.Item>
        <DropdownMenu.Item
          onClick={() =>
            showShareModal({
              type: node.type,
              uuid: node.id,
              conversationId: conversationQualifiedId.id,
              cellsRepository,
            })
          }
        >
          {t('cells.options.share')}
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onClick={() =>
            node.type === 'folder' ? openFolder({conversationQualifiedId, name: node.name}) : handleOpenFile(node)
          }
        >
          {t('cells.options.open')}
        </DropdownMenu.Item>
        {url && (
          <DropdownMenu.Item onClick={() => forcedDownloadFile({url, name})}>
            {t('cells.options.download')}
          </DropdownMenu.Item>
        )}
        <DropdownMenu.Item onClick={() => setIsTagsModalOpen(true)}>{t('cells.options.tags')}</DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => handleRenameNode()}>Rename</DropdownMenu.Item>
        <DropdownMenu.Item
          onClick={() =>
            showMoveToRecycleBinModal({
              node,
              onMoveToRecycleBin: () => handleDeleteNode({uuid: node.id, permanently: false}),
            })
          }
        >
          {t('cells.options.delete')}
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
      <CellsTagsModal
        uuid={node.id}
        isOpen={isTagsModalOpen}
        onClose={() => setIsTagsModalOpen(false)}
        cellsRepository={cellsRepository}
        selectedTags={node.tags}
        onRefresh={onRefresh}
      />
    </>
  );
};
