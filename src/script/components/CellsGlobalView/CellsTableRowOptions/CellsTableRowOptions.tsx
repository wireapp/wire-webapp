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

import {showContextMenu} from 'src/script/ui/ContextMenu';
import {isSpaceOrEnterKey} from 'Util/KeyboardUtil';
import {setContextMenuPosition} from 'Util/util';

import {buttonStyles, iconStyles} from './CellsTableRowOptions.styles';

interface CellsTableRowOptionsProps {
  onOpen: () => void;
  onShare: () => void;
  downloadUrl: string;
  onDelete: () => void;
}

export const CellsTableRowOptions = ({onOpen, onShare, downloadUrl, onDelete}: CellsTableRowOptionsProps) => {
  const showOptionsMenu = (event: ReactMouseEvent<HTMLButtonElement> | MouseEvent) => {
    const openLabel = 'Open';
    const shareLabel = 'Share';
    const downloadLabel = 'Download';
    const deleteLabel = 'Delete';

    showContextMenu({
      event,
      entries: [
        {label: shareLabel, click: onShare},
        {label: openLabel, click: onOpen},
        {as: 'link', label: downloadLabel, href: downloadUrl, download: true},
        {label: deleteLabel, click: onDelete},
      ],
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
    <button css={buttonStyles} onKeyDown={handleKeyDown} onClick={showOptionsMenu} aria-label="More options">
      <MoreIcon css={iconStyles} />
    </button>
  );
};
