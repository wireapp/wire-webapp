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
import {openFolder} from 'Components/Conversation/ConversationCells/common/openFolder/openFolder';
import {
  isInRecycleBin,
  isRootRecycleBinPath,
} from 'Components/Conversation/ConversationCells/common/recycleBin/recycleBin';
import {useFileHistoryModal} from 'Components/Modals/FileHistoryModal/hooks/useFileHistoryModal';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {useApplicationContext} from 'src/script/page/RootProvider';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';
import {isFileEditable} from 'Util/fileTypeUtil';
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
  onCloseSearchView?: () => void;
}

export const CellsTableRowOptions = ({
  node,
  cellsRepository,
  conversationQualifiedId,
  conversationName,
  onRefresh,
  onCloseSearchView,
}: CellsTableRowOptionsProps) => {
  const {translate} = useApplicationContext();

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <button css={buttonStyles} aria-label={translate('cells.options.label')}>
          <MoreIcon css={iconStyles} />
          <span css={textStyles}>{translate('cells.options.label')}</span>
        </button>
      </DropdownMenu.Trigger>
      <CellsTableRowOptionsContent
        node={node}
        cellsRepository={cellsRepository}
        conversationQualifiedId={conversationQualifiedId}
        conversationName={conversationName}
        onRefresh={onRefresh}
        onCloseSearchView={onCloseSearchView}
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
  onCloseSearchView,
}: CellsTableRowOptionsProps) => {
  const {fireAndForgetInvoker, translate} = useApplicationContext();
  const {handleOpenFile} = useCellsFilePreviewModal();
  const [isMoveNodeModalOpen, setIsMoveNodeModalOpen] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isRenameNodeModalOpen, setIsRenameNodeModalOpen] = useState(false);
  const {showModal} = useFileHistoryModal();

  const url = node.url;
  const name = node.type === CellNodeType.FOLDER ? `${node.name}.zip` : node.name;

  const restoreNodeFailedNotification = useAppNotification({
    message: translate('cells.restore.error'),
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
    deleteNodeFailedMessage: translate('cells.deleteModal.error'),
  });

  const isRootRecycleBin = isRootRecycleBinPath();
  const isNestedRecycleBin = isInRecycleBin();

  const isEditable = node.type === CellNodeType.FILE && isFileEditable(node.extension);

  const onConfirmRestore = useCallback(() => {
    onRefresh();
    handleOpenFile(node, false);
  }, [handleOpenFile, node, onRefresh]);

  if (isRootRecycleBin || isNestedRecycleBin) {
    return (
      <DropdownMenu.Content>
        <DropdownMenu.Item
          onClick={() =>
            isRootRecycleBin
              ? showRestoreRootNodeModal({
                  node,
                  onRestoreNode: restoreNestedNode,
                  translate,
                })
              : showRestoreNestedNodeModal({
                  node,
                  onRestoreNode: restoreParentNode,
                  parentNodeName: rootParentName,
                  translate,
                })
          }
        >
          {translate('cells.options.restore')}
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onClick={() =>
            showDeletePermanentlyModal({
              node,
              onDeletePermanently: () => deleteNode({uuid: node.id, permanently: true}),
              translate,
            })
          }
        >
          {translate('cells.options.deletePermanently')}
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
              ? openFolder({path: node.path, onBeforeNavigate: onCloseSearchView})
              : handleOpenFile(node)
          }
        >
          {translate('cells.options.open')}
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onClick={() =>
            showShareModal({
              type: node.type,
              uuid: node.id,
              conversationId: conversationQualifiedId.id,
              cellsRepository,
              fireAndForgetInvoker,
              translate,
            })
          }
        >
          {translate('cells.options.share')}
        </DropdownMenu.Item>

        {url !== undefined && url.length > 0 && (
          <DropdownMenu.Item onClick={() => forcedDownloadFile({url, name})}>
            {translate('cells.options.download')}
          </DropdownMenu.Item>
        )}
        <DropdownMenu.Item onClick={() => setIsRenameNodeModalOpen(true)}>
          {translate('cells.options.rename')}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => setIsMoveNodeModalOpen(true)}>
          {translate('cells.options.move')}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => setIsTagsModalOpen(true)}>
          {translate('cells.options.tags')}
        </DropdownMenu.Item>
        {isEditable && (
          <>
            <DropdownMenu.Item onClick={() => handleOpenFile(node, true)}>
              {translate('cells.options.edit')}
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={() => showModal(node.id, onConfirmRestore)}>
              {translate('cells.options.versionHistory')}
            </DropdownMenu.Item>
          </>
        )}
        <DropdownMenu.Item
          onClick={() =>
            showMoveToRecycleBinModal({
              node,
              onMoveToRecycleBin: () => deleteNode({uuid: node.id, permanently: false}),
              translate,
            })
          }
        >
          {translate('cells.options.delete')}
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
