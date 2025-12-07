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

import {useState} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {CellNodeType} from 'src/script/types/cellNode';
import {t} from 'Util/LocalizerUtil';

import {Button, ButtonVariant, DropdownMenu, PlusIcon} from '@wireapp/react-ui-kit';

import {CellsNewItemModal} from './CellsNewItemModal/CellsNewItemModal';
import {buttonStyles, iconStyles} from './CellsNewMenu.styles';

import {getCellsFilesPath} from '../../common/getCellsFilesPath/getCellsFilesPath';

interface CellsNewMenuProps {
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  onRefresh: () => void;
}

export const CellsNewMenu = ({cellsRepository, conversationQualifiedId, onRefresh}: CellsNewMenuProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<CellNodeType>(CellNodeType.FILE);

  const openModal = (type: CellNodeType) => {
    setModalType(type);
    setIsModalOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenu.Trigger asChild>
          <Button variant={ButtonVariant.TERTIARY} css={buttonStyles}>
            <PlusIcon css={iconStyles} />
            {t('cells.newItemMenu.button')}
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onClick={() => openModal(CellNodeType.FOLDER)}>
            {t('cells.newItemMenu.folder')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
      {isModalOpen && (
        <CellsNewItemModal
          type={modalType}
          currentPath={getCellsFilesPath()}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          cellsRepository={cellsRepository}
          conversationQualifiedId={conversationQualifiedId}
          onSuccess={() => {
            onRefresh();
            setIsModalOpen(false);
          }}
        />
      )}
    </>
  );
};
