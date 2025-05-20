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

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {DropdownMenu, MoreIcon} from '@wireapp/react-ui-kit';

import {CellItem} from 'Components/Conversation/ConversationCells/common/cellFile/cellFile';
import {openFolder} from 'Components/Conversation/ConversationCells/common/openFolder/openFolder';
import {isRecycleBinPath} from 'Components/Conversation/ConversationCells/common/recycleBin/recycleBin';
import {CellsRepository} from 'src/script/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';
import {forcedDownloadFile} from 'Util/util';

import {buttonStyles, iconStyles, textStyles} from './CellsTableRowOptions.styles';
import {showDeletePermanentlyModal} from './showDeletePermanentlyModal/showDeletePermanentlyModal';
import {showMoveToRecycleBinModal} from './showMoveToRecycleBinModal/showMoveToRecycleBinModal';
import {showRestoreNodeModal} from './showRestoreNodeModal/showRestoreNodeModal';

import {useCellsFilePreviewModal} from '../../common/CellsFilePreviewModalContext/CellsFilePreviewModalContext';
import {showShareFileModal} from '../CellsFileShareModal/CellsFileShareModal';

interface CellsTableRowOptionsProps {
  node: CellItem;
  onDelete: ({uuid, permanently}: {uuid: string; permanently?: boolean}) => void;
  onRestoreNode: ({uuid}: {uuid: string}) => void;
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
}

export const CellsTableRowOptions = ({
  node,
  onDelete,
  onRestoreNode,
  cellsRepository,
  conversationQualifiedId,
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
        onDelete={onDelete}
        onRestoreNode={onRestoreNode}
        cellsRepository={cellsRepository}
        conversationQualifiedId={conversationQualifiedId}
      />
    </DropdownMenu>
  );
};

const CellsTableRowOptionsContent = ({
  node,
  onDelete,
  onRestoreNode,
  cellsRepository,
  conversationQualifiedId,
}: CellsTableRowOptionsProps) => {
  const {handleOpenFile} = useCellsFilePreviewModal();

  const url = node.url;
  const name = node.type === 'folder' ? `${node.name}.zip` : node.name;

  if (isRecycleBinPath()) {
    return (
      <DropdownMenu.Content>
        <DropdownMenu.Item
          onClick={() =>
            showRestoreNodeModal({
              node,
              onRestoreNode: () => onRestoreNode({uuid: node.id}),
            })
          }
        >
          {t('cellsGlobalView.optionRestore')}
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onClick={() =>
            showDeletePermanentlyModal({node, onDeletePermanently: () => onDelete({uuid: node.id, permanently: true})})
          }
        >
          {t('cellsGlobalView.optionDeletePermanently')}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    );
  }

  return (
    <DropdownMenu.Content>
      <DropdownMenu.Item
        onClick={() => showShareFileModal({uuid: node.id, conversationId: conversationQualifiedId.id, cellsRepository})}
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
          showMoveToRecycleBinModal({node, onMoveToRecycleBin: () => onDelete({uuid: node.id, permanently: false})})
        }
      >
        {t('cellsGlobalView.optionDelete')}
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  );
};
