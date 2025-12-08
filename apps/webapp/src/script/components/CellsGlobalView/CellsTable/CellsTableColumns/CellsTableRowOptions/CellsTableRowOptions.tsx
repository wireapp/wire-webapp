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

import {openFolder} from 'Components/CellsGlobalView/common/openFolder/openFolder';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';
import {t} from 'Util/LocalizerUtil';
import {forcedDownloadFile} from 'Util/util';

import {buttonStyles, iconStyles, textStyles} from './CellsTableRowOptions.styles';

import {useCellsFilePreviewModal} from '../../common/CellsFilePreviewModalContext/CellsFilePreviewModalContext';
import {showShareModal} from '../CellsShareModal/CellsShareModal';

interface CellsTableRowOptionsProps {
  node: CellNode;
  cellsRepository: CellsRepository;
}

export const CellsTableRowOptions = ({node, cellsRepository}: CellsTableRowOptionsProps) => {
  const {handleOpenFile} = useCellsFilePreviewModal();

  const url = node.url;
  const name = node.type === CellNodeType.FOLDER ? `${node.name}.zip` : node.name;

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <button css={buttonStyles} aria-label={t('cells.options.label')}>
          <MoreIcon css={iconStyles} />
          <span css={textStyles}>{t('cells.options.label')}</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item
          onClick={() => (node.type === CellNodeType.FOLDER ? openFolder({path: node.path}) : handleOpenFile(node))}
        >
          {t('cells.options.open')}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => showShareModal({type: node.type, uuid: node.id, cellsRepository})}>
          {t('cells.options.share')}
        </DropdownMenu.Item>
        {!!url && (
          <DropdownMenu.Item
            onClick={() =>
              forcedDownloadFile({
                url,
                name,
              })
            }
          >
            {t('cells.options.download')}
          </DropdownMenu.Item>
        )}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
