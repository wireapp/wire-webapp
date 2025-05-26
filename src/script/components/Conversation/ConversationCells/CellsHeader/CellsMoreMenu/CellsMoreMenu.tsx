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

import {DropdownMenu, IconButton, IconButtonVariant, MoreIcon, TrashIcon} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {buttonStyles, itemStyles} from './CellsMoreMenu.styles';

import {openBreadcrumb} from '../../common/openBreadcrumb/openBreadcrumb';
import {RECYCLE_BIN_PATH} from '../../common/recycleBin/recycleBin';

interface CellsMoreMenuProps {
  conversationQualifiedId: QualifiedId;
}

export const CellsMoreMenu = ({conversationQualifiedId}: CellsMoreMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <IconButton variant={IconButtonVariant.PRIMARY} css={buttonStyles}>
          <MoreIcon />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item
          onClick={() => {
            openBreadcrumb({
              conversationQualifiedId,
              path: RECYCLE_BIN_PATH,
            });
          }}
        >
          <div css={itemStyles}>
            <TrashIcon />
            {t('cells.recycleBin.moreMenu')}
          </div>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
