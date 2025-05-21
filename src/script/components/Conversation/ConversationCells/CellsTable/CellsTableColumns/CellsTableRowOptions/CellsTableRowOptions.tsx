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

import {KeyboardEvent, MouseEvent as ReactMouseEvent, useCallback, useState} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {MoreIcon} from '@wireapp/react-ui-kit';

import {CellNode} from 'Components/Conversation/ConversationCells/common/cellNode/cellNode';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {CellsRepository} from 'src/script/cells/CellsRepository';
import {ContextMenuEntry, showContextMenu} from 'src/script/ui/ContextMenu';
import {isSpaceOrEnterKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {forcedDownloadFile, setContextMenuPosition} from 'Util/util';

import {CellsMoveNodeModal} from './CellsMoveNodeModal/CellsMoveNodeModal';
import {buttonStyles, iconStyles, textStyles} from './CellsTableRowOptions.styles';

import {openFolder} from '../../../common/openFolder/openFolder';
import {useCellsFilePreviewModal} from '../../common/CellsFilePreviewModalContext/CellsFilePreviewModalContext';
import {showShareFileModal} from '../CellsNodeShareModal/CellsNodeShareModal';

interface CellsTableRowOptionsProps {
  node: CellNode;
  onDelete: (uuid: string) => void;
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  conversationName: string;
}

export const CellsTableRowOptions = ({
  node,
  onDelete,
  cellsRepository,
  conversationQualifiedId,
  conversationName,
}: CellsTableRowOptionsProps) => {
  const {id, selectedFile, handleOpenFile} = useCellsFilePreviewModal();
  const [isMoveNodeModalOpen, setIsMoveNodeModalOpen] = useState(false);

  const showDeleteFileModal = useCallback(
    ({uuid, name}: {uuid: string; name: string}) => {
      PrimaryModal.show(PrimaryModal.type.CONFIRM, {
        primaryAction: {action: () => onDelete(uuid), text: t('cellsGlobalView.optionDelete')},
        text: {
          message: t('cellsGlobalView.deleteModalDescription', {name}),
          title: t('cellsGlobalView.deleteModalHeading'),
        },
      });
    },
    [onDelete],
  );

  const getDownloadName = (file: CellNode) => {
    if (file.type === 'folder') {
      return `${file.name}.zip`;
    }
    return file.name;
  };

  const showOptionsMenu = (event: ReactMouseEvent<HTMLButtonElement> | MouseEvent) => {
    const openLabel = t('cellsGlobalView.optionOpen');
    const shareLabel = t('cellsGlobalView.optionShare');
    const downloadLabel = t('cellsGlobalView.optionDownload');
    const deleteLabel = t('cellsGlobalView.optionDelete');

    const url = node.url;
    const name = getDownloadName(node);

    showContextMenu({
      event,
      entries: [
        {
          label: 'Move',
          click: () => setIsMoveNodeModalOpen(true),
        },
        {
          label: shareLabel,
          click: () => showShareFileModal({uuid: node.id, conversationId: conversationQualifiedId.id, cellsRepository}),
        },
        {
          label: openLabel,
          click: () =>
            node.type === 'folder' ? openFolder({conversationQualifiedId, name: node.name}) : handleOpenFile(node),
        },
        url
          ? {
              label: downloadLabel,
              click: () =>
                forcedDownloadFile({
                  url,
                  name,
                }),
            }
          : undefined,
        {label: deleteLabel, click: () => showDeleteFileModal({uuid: node.id, name: node.name})},
      ].filter(Boolean) as ContextMenuEntry[],
      identifier: 'file-preview-error-more-button',
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (isSpaceOrEnterKey(event.key)) {
      const newEvent = setContextMenuPosition(event);
      showOptionsMenu(newEvent);
    }
  };

  return (
    <>
      <button
        css={buttonStyles}
        onKeyDown={handleKeyDown}
        onClick={showOptionsMenu}
        aria-label={t('cellsGlobalView.optionsLabel')}
        aria-controls={id}
        aria-expanded={!!selectedFile}
        aria-haspopup="dialog"
      >
        <MoreIcon css={iconStyles} />
        <span css={textStyles}>{t('cellsGlobalView.optionsLabel')}</span>
      </button>
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
