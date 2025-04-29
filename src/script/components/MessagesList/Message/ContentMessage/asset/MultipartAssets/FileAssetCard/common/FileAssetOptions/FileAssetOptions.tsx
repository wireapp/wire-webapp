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

import {MouseEvent as ReactMouseEvent, KeyboardEvent, useId} from 'react';

import {MoreIcon} from '@wireapp/react-ui-kit';

import {showContextMenu} from 'src/script/ui/ContextMenu';
import {isSpaceOrEnterKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {setContextMenuPosition} from 'Util/util';

import {buttonStyles, iconStyles} from './FileAssetOptions.styles';

interface FileAssetOptionsProps {
  onOpen: () => void;
}

export const FileAssetOptions = ({onOpen}: FileAssetOptionsProps) => {
  const id = useId();

  const showOptionsMenu = (event: ReactMouseEvent<HTMLButtonElement> | MouseEvent) => {
    showContextMenu({
      event,
      entries: [
        {
          label: t('cellsGlobalView.optionOpen'),
          click: () => onOpen(),
        },
      ],
      identifier: id,
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
        id={id}
        onKeyDown={handleKeyDown}
        onClick={showOptionsMenu}
        aria-label={t('cellsGlobalView.optionsLabel')}
      >
        <MoreIcon css={iconStyles} />
      </button>
    </>
  );
};
