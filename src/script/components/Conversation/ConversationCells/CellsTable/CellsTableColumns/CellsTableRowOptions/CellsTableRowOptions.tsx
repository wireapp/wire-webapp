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

import {useState} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {DropdownMenu, MoreIcon} from '@wireapp/react-ui-kit';

import {useAppNotification} from 'Components/AppNotification/AppNotification';
import {openFolder} from 'Components/Conversation/ConversationCells/common/openFolder/openFolder';
import {
  isInRecycleBin,
  isRootRecycleBinPath,
} from 'Components/Conversation/ConversationCells/common/recycleBin/recycleBin';
import {useFileHistoryModal} from 'Components/Modals/FileHistoryModal/hooks/useFileHistoryModal';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';
import {isFileEditable} from 'Util/FileTypeUtil';
import {t} from 'Util/LocalizerUtil';
import {forcedDownloadFile} from 'Util/util';

import {CellsMoveNodeModal} from './CellsMoveNodeModal/CellsMoveNodeModal';
import {CellsRenameNodeModal} from './CellsRenameNodeModal/CellsRenameNodeModal';
import {buttonStyles, iconStyles, textStyles} from './CellsTableRowOptions.styles';
import {CellsTagsModal} from './CellsTagsModal/CellsTagsModal';
import {showDeletePermanentlyModal} from './showDeletePermanentlyModal/showDeletePermanentlyModal';
import {showMoveToRecycleBinModal} from './showMoveToRecycleBinModal/showMoveToRecycleBinModal';
import {showRestoreNestedNodeModal} from './showRestoreNestedNodeModal/showRestoreNestedNodeModal';
import {showRestoreRootNodeModal} from './showRestoreRootNodeModal/showRestoreRootNodeModal';
import {useDeleteNode} from './useDeleteNode/useDeleteNode';
import {useRestoreNestedNode} from './useRestoreNestedNode/useRestoreNestedNode';
import {useRestoreParentNode} from './useRestoreParentNode/useRestoreParentNode';

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
  const [isMoveNodeModalOpen, setIsMoveNodeModalOpen] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isRenameNodeModalOpen, setIsRenameNodeModalOpen] = useState(false);
  const {showModal} = useFileHistoryModal();

  const url = node.url;
  const name = node.type === CellNodeType.FOLDER ? `${node.name}.zip` : node.name;

  const restoreNodeFailedNotification = useAppNotification({
    message: t('cells.restore.error'),
  });

  const {restoreNestedNode} = useRestoreNestedNode({
    node,
    conversationQualifiedId,
    cellsRepository,
    onError: restoreNodeFailedNotification.show,
  });

  const {restoreParentNode, rootParentName} = useRestoreParentNode({
    childNode: node,
    conversationQualifiedId,
    cellsRepository,
    onError: restoreNodeFailedNotification.show,
  });

  const {deleteNode} = useDeleteNode({
    conversationQualifiedId,
    cellsRepository,
  });

  const isRootRecycleBin = isRootRecycleBinPath();
  const isNestedRecycleBin = isInRecycleBin();

  const isEditable = node.type === CellNodeType.FILE && isFileEditable(node.extension);

  if (isRootRecycleBin || isNestedRecycleBin) {
    return (
      <DropdownMenu.Content>
        <DropdownMenu.Item
          onClick={() =>
            isRootRecycleBin
              ? showRestoreRootNodeModal({
                  node,
                  onRestoreNode: restoreNestedNode,
                })
              : showRestoreNestedNodeModal({
                  node,
                  onRestoreNode: restoreParentNode,
                  parentNodeName: rootParentName,
                })
          }
        >
          {t('cells.options.restore')}
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onClick={() =>
            showDeletePermanentlyModal({
              node,
              onDeletePermanently: () => deleteNode({uuid: node.id, permanently: true}),
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
        <DropdownMenu.Item
          onClick={() =>
            node.type === CellNodeType.FOLDER
              ? openFolder({conversationQualifiedId, name: node.name})
              : handleOpenFile(node)
          }
        >
          {t('cells.options.open')}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => showModal(node.id)}>{t('cells.options.versionHistory')}</DropdownMenu.Item>
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

        {!!url && (
          <DropdownMenu.Item onClick={() => forcedDownloadFile({url, name})}>
            {t('cells.options.download')}
          </DropdownMenu.Item>
        )}
        <DropdownMenu.Item onClick={() => setIsRenameNodeModalOpen(true)}>
          {t('cells.options.rename')}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => setIsMoveNodeModalOpen(true)}>{t('cells.options.move')}</DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => setIsTagsModalOpen(true)}>{t('cells.options.tags')}</DropdownMenu.Item>
        {isEditable && (
          <DropdownMenu.Item onClick={() => handleOpenFile(node, true)}>{t('cells.options.edit')}</DropdownMenu.Item>
        )}
        <DropdownMenu.Item
          onClick={() =>
            showMoveToRecycleBinModal({
              node,
              onMoveToRecycleBin: () => deleteNode({uuid: node.id, permanently: false}),
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
      <CellsRenameNodeModal
        isOpen={isRenameNodeModalOpen}
        onClose={() => setIsRenameNodeModalOpen(false)}
        node={node}
        cellsRepository={cellsRepository}
        onRefresh={onRefresh}
      />
    </>
  );
};
