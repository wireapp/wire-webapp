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

import {KeyboardEvent, MouseEvent as ReactMouseEvent, useState} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {Button, ButtonVariant, PlusIcon} from '@wireapp/react-ui-kit';

import {CellsRepository} from 'src/script/cells/CellsRepository';
import {showContextMenu} from 'src/script/ui/ContextMenu';
import {isSpaceOrEnterKey} from 'Util/KeyboardUtil';
import {setContextMenuPosition} from 'Util/util';

import {showNewCellsItemModal} from './CellsNewItemModal/CellsNewItemModal';
import {buttonStyles, iconStyles} from './CellsNewMenu.styles';

import {getCellsApiPath} from '../../common/getCellsApiPath/getCellsApiPath';

interface CellsNewMenuProps {
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  onRefresh: () => void;
}

export const CellsNewMenu = ({cellsRepository, conversationQualifiedId, onRefresh}: CellsNewMenuProps) => {
  const [name, setName] = useState('X folder');

  const showOptionsMenu = (event: ReactMouseEvent<HTMLButtonElement> | MouseEvent) => {
    showContextMenu({
      event,
      entries: [
        {
          label: 'Create folder',
          click: () =>
            showNewCellsItemModal({
              onSubmit: async () => {
                await cellsRepository.createFolder({
                  path: getCellsApiPath({conversationQualifiedId}),
                  name,
                });
                onRefresh();
              },
              type: 'folder',
              onChange: setName,
            }),
        },
        {
          label: 'Create file',
          click: () =>
            showNewCellsItemModal({
              onSubmit: async () => {
                await cellsRepository.createFile({
                  path: getCellsApiPath({conversationQualifiedId}),
                  name,
                });
                onRefresh();
              },
              type: 'file',
              onChange: setName,
            }),
        },
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
    <Button variant={ButtonVariant.TERTIARY} onKeyDown={handleKeyDown} onClick={showOptionsMenu} css={buttonStyles}>
      <PlusIcon css={iconStyles} />
      New
    </Button>
  );
};
