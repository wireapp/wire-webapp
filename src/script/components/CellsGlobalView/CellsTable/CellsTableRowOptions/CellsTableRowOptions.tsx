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

import {KeyboardEvent, MouseEvent as ReactMouseEvent} from 'react';

import {MoreIcon} from '@wireapp/react-ui-kit';

import {ContextMenuEntry, showContextMenu} from 'src/script/ui/ContextMenu';
import {isSpaceOrEnterKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {setContextMenuPosition} from 'Util/util';

import {buttonStyles, iconStyles} from './CellsTableRowOptions.styles';

interface CellsTableRowOptionsProps {
  onOpen?: () => void;
  onShare: () => void;
  onDownload?: () => void;
  onDelete: () => void;
}

export const CellsTableRowOptions = ({onOpen, onShare, onDownload, onDelete}: CellsTableRowOptionsProps) => {
  const showOptionsMenu = (event: ReactMouseEvent<HTMLButtonElement> | MouseEvent) => {
    const openLabel = t('cellsGlobalView.optionOpen');
    const shareLabel = t('cellsGlobalView.optionShare');
    const downloadLabel = t('cellsGlobalView.optionDownload');
    const deleteLabel = t('cellsGlobalView.optionDelete');

    showContextMenu({
      event,
      entries: [
        {label: shareLabel, click: onShare},
        onOpen ? {label: openLabel, click: onOpen} : undefined,
        onDownload ? {label: downloadLabel, click: onDownload} : undefined,
        {label: deleteLabel, click: onDelete},
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
    >
      <MoreIcon css={iconStyles} />
    </button>
  );
};
