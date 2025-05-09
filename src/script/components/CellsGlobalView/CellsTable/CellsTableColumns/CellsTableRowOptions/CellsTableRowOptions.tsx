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

import {KeyboardEvent, MouseEvent as ReactMouseEvent, useCallback} from 'react';

import {MoreIcon} from '@wireapp/react-ui-kit';

import {openFolder} from 'Components/CellsGlobalView/common/openFolder/openFolder';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {CellsRepository} from 'src/script/cells/CellsRepository';
import {ContextMenuEntry, showContextMenu} from 'src/script/ui/ContextMenu';
import {isSpaceOrEnterKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {forcedDownloadFile, setContextMenuPosition} from 'Util/util';

import {buttonStyles, iconStyles, textStyles} from './CellsTableRowOptions.styles';

import {CellItem} from '../../../common/cellFile/cellFile';
import {useCellsFilePreviewModal} from '../../common/CellsFilePreviewModalContext/CellsFilePreviewModalContext';
import {showShareFileModal} from '../CellsShareFileModal/CellsShareFileModal';

interface CellsTableRowOptionsProps {
  file: CellItem;
  onDelete: (uuid: string) => void;
  cellsRepository: CellsRepository;
}

export const CellsTableRowOptions = ({file, onDelete, cellsRepository}: CellsTableRowOptionsProps) => {
  const {id, selectedFile, handleOpenFile} = useCellsFilePreviewModal();

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

  const getDownloadName = (file: CellItem) => {
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

    const url = file.url;
    const name = getDownloadName(file);

    showContextMenu({
      event,
      entries: [
        {
          label: shareLabel,
          click: () => showShareFileModal({uuid: file.id, cellsRepository}),
        },
        {
          label: openLabel,
          click: () => (file.type === 'folder' ? openFolder({path: file.path}) : handleOpenFile(file)),
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
        {label: deleteLabel, click: () => showDeleteFileModal({uuid: file.id, name: file.name})},
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
  );
};
