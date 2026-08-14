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

import {DropdownMenu, MoreIcon} from '@wireapp/react-ui-kit';

import {
  CELLS_ACTION,
  useCellsActionPermissions,
} from 'Components/Conversation/ConversationCells/common/CellsSelfUserDriveRole/CellsSelfUserDriveRoleContext';
import {useFileHistoryModal} from 'Components/Modals/FileHistoryModal/hooks/useFileHistoryModal';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {isFileEditable} from 'Util/fileTypeUtil';
import {forcedDownloadFile, getFileNameWithExtension} from 'Util/util';

import {buttonStyles, iconStyles} from './FileAssetOptions.styles';

interface FileAssetOptionsProps {
  src?: string;
  name: string;
  extension: string;
  onOpen: (isEditMode?: boolean) => void;
  id: string;
}

export const FileAssetOptions = ({id, onOpen, src, name, extension}: FileAssetOptionsProps) => {
  const {translate} = useApplicationContext();
  const canPerformCellsAction = useCellsActionPermissions();
  const fileNameWithExtension = getFileNameWithExtension(name, extension);
  const isEditable = isFileEditable(extension);
  const {showModal} = useFileHistoryModal();

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <button aria-label={translate('cells.options.label')} css={buttonStyles}>
          <MoreIcon css={iconStyles} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item onClick={onOpen}>{translate('cells.options.open')}</DropdownMenu.Item>
        {isEditable && canPerformCellsAction(CELLS_ACTION.EDIT) && (
          <>
            <DropdownMenu.Item onClick={() => onOpen(true)}>{translate('cells.options.edit')}</DropdownMenu.Item>
          </>
        )}
        {isEditable && canPerformCellsAction(CELLS_ACTION.VIEW_VERSION_HISTORY) && (
          <DropdownMenu.Item onClick={() => showModal(id, () => onOpen(false))}>
            {translate('cells.options.versionHistory')}
          </DropdownMenu.Item>
        )}
        {canPerformCellsAction(CELLS_ACTION.DOWNLOAD) && src !== undefined && src !== '' && (
          <DropdownMenu.Item onClick={() => forcedDownloadFile({url: src, name: fileNameWithExtension})}>
            {translate('cells.options.download')}
          </DropdownMenu.Item>
        )}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
