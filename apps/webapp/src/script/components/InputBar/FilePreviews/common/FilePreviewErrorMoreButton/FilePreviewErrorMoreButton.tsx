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

import {showContextMenu} from 'src/script/ui/ContextMenu';
import {isSpaceOrEnterKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {setContextMenuPosition} from 'Util/util';

import {MoreIcon} from '@wireapp/react-ui-kit';

import {buttonStyles, iconStyles} from './FilePreviewErrorMoreButton.styles';

interface FilePreviewErrorMoreButtonProps {
  onDelete: () => void;
  onRetry: () => void;
}

export const FilePreviewErrorMoreButton = ({onDelete, onRetry}: FilePreviewErrorMoreButtonProps) => {
  const showOptionsMenu = (event: ReactMouseEvent<HTMLButtonElement> | MouseEvent) => {
    const retryLabel = t('conversationFilePreviewErrorRetry');
    const removeLabel = t('conversationFilePreviewErrorRemove');

    showContextMenu({
      event,
      entries: [
        {title: retryLabel, label: retryLabel, click: onRetry},
        {title: removeLabel, label: removeLabel, click: onDelete},
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
    <button
      css={buttonStyles}
      onKeyDown={handleKeyDown}
      onClick={showOptionsMenu}
      aria-label={t('conversationFilePreviewErrorMoreOptions')}
    >
      <MoreIcon css={iconStyles} />
    </button>
  );
};
