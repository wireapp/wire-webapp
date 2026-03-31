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
import {collaboraNewDocumentCreationMenuFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/RootProvider';
import {t} from 'Util/localizerUtil';

import {CellsNewFileModal} from './CellsNewFileModal/CellsNewFileModal';
import {CellsNewFolderModal} from './CellsNewFolderModal/CellsNewFolderModal';
import {buttonStyles, iconStyles} from './CellsNewMenu.styles';

import {getCellsFilesPath} from '../../common/getCellsFilesPath/getCellsFilesPath';

interface CellsNewMenuProps {
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  onRefresh: () => void;
}

export type CellsNewFileType = 'document' | 'spreadsheet' | 'presentation';

export const CellsNewMenu = ({cellsRepository, conversationQualifiedId, onRefresh}: CellsNewMenuProps) => {
  const {isFeatureToggleEnabled} = useApplicationContext();
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [fileType, setFileType] = useState<CellsNewFileType>('document');
  const isCollaboraNewDocumentCreationMenuEnabled = isFeatureToggleEnabled(
    collaboraNewDocumentCreationMenuFeatureToggleName,
  );

  const openFolderModal = () => setIsFolderModalOpen(true);

  const openFileModal = (selectedFileType: CellsNewFileType) => {
    setFileType(selectedFileType);
    setIsFileModalOpen(true);
  };

  const commonProps = {
    cellsRepository,
    conversationQualifiedId,
    currentPath: getCellsFilesPath(),
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
          <DropdownMenu.Item onClick={openFolderModal}>{t('cells.newItemMenu.folder')}</DropdownMenu.Item>
          {isCollaboraNewDocumentCreationMenuEnabled && (
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger>{t('cells.newItemMenu.file')}</DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                <DropdownMenu.Item onClick={() => openFileModal('document')}>
                  {t('cells.newItemMenu.document')}
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => openFileModal('spreadsheet')}>
                  {t('cells.newItemMenu.spreadsheet')}
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => openFileModal('presentation')}>
                  {t('cells.newItemMenu.presentation')}
                </DropdownMenu.Item>
              </DropdownMenu.SubContent>
            </DropdownMenu.Sub>
          )}
        </DropdownMenu.Content>
      </DropdownMenu>
      <CellsNewFolderModal
        {...commonProps}
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSuccess={() => {
          onRefresh();
          setIsFolderModalOpen(false);
        }}
      />
      {isCollaboraNewDocumentCreationMenuEnabled && (
        <CellsNewFileModal
          {...commonProps}
          isOpen={isFileModalOpen}
          fileType={fileType}
          onClose={() => setIsFileModalOpen(false)}
          onSuccess={() => {
            onRefresh();
            setIsFileModalOpen(false);
          }}
        />
      )}
    </>
  );
};
