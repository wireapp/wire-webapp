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

import {Button, ButtonVariant, DropdownMenu, PlusIcon} from '@wireapp/react-ui-kit';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {CellNodeType} from 'src/script/types/cellNode';
import {t} from 'Util/localizerUtil';

import {CellsNewItemModal} from './CellsNewItemModal/CellsNewItemModal';
import {buttonStyles, iconStyles} from './CellsNewMenu.styles';

import {getCellsFilesPath} from '../../common/getCellsFilesPath/getCellsFilesPath';

interface CellsNewMenuProps {
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  onRefresh: () => void;
}

export type CellsNewFileType = 'document' | 'spreadsheet' | 'presentation';

export const CellsNewMenu = ({cellsRepository, conversationQualifiedId, onRefresh}: CellsNewMenuProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<CellNodeType>(CellNodeType.FILE);
  const [fileType, setFileType] = useState<CellsNewFileType>('document');

  const openModal = (type: CellNodeType, selectedFileType: CellsNewFileType = 'document') => {
    setModalType(type);
    setFileType(selectedFileType);
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
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>{t('cells.newItemMenu.file')}</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Item onClick={() => openModal(CellNodeType.FILE, 'document')}>
                {t('cells.newItemMenu.document')}
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => openModal(CellNodeType.FILE, 'spreadsheet')}>
                {t('cells.newItemMenu.spreadsheet')}
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => openModal(CellNodeType.FILE, 'presentation')}>
                {t('cells.newItemMenu.presentation')}
              </DropdownMenu.Item>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
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
          fileType={fileType}
          onSuccess={() => {
            onRefresh();
            setIsModalOpen(false);
          }}
        />
      )}
    </>
  );
};
