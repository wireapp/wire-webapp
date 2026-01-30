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

import {CellsNewNodeForm} from 'Components/Conversation/ConversationCells/common/CellsNewNodeForm/CellsNewNodeForm';
import {useCellsNewItemForm} from 'Components/Conversation/ConversationCells/common/useCellsNewNodeForm/useCellsNewNodeForm';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {CellNode} from 'src/script/types/cellNode';
import {t} from 'Util/LocalizerUtil';

import {descriptionStyles} from './CellsNewItemModal.styles';

import {useCellsFilePreviewModal} from '../../../CellsTable/common/CellsFilePreviewModalContext/CellsFilePreviewModalContext';
import {CellsModal} from '../../../common/CellsModal/CellsModal';

interface CellsNewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: CellNode['type'];
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  onSuccess: () => void;
  currentPath: string;
}

export const CellsNewItemModal = ({
  isOpen,
  onClose,
  type,
  cellsRepository,
  conversationQualifiedId,
  onSuccess,
  currentPath,
}: CellsNewItemModalProps) => {
  const isFolder = type === 'folder';
  const {handleOpenFile} = useCellsFilePreviewModal();

  const fileTypeOptions = [
    {value: 'docx', label: t('cells.newItemMenuModal.typeDocument')},
    {value: 'xlsx', label: t('cells.newItemMenuModal.typeSpreadsheet')},
    {value: 'pptx', label: t('cells.newItemMenuModal.typePresentation')},
  ];
  const [selectedFileType, setSelectedFileType] = useState(fileTypeOptions[0]);

  const {name, error, isSubmitting, handleSubmit, handleChange} = useCellsNewItemForm({
    type,
    cellsRepository,
    conversationQualifiedId,
    onSuccess,
    currentPath,
    fileExtension: type === 'file' ? selectedFileType.value : undefined,
    onCreatedFile: type === 'file' ? file => handleOpenFile(file, true) : undefined,
  });

  return (
    <CellsModal isOpen={isOpen} onClose={onClose} size="large">
      <CellsModal.Header>
        {t(!isFolder ? 'cells.newItemMenuModal.headlineFolder' : 'cells.newItemMenuModal.headlineFile')}
      </CellsModal.Header>
      <p css={descriptionStyles}>
        {t(!isFolder ? 'cells.newItemMenuModal.descriptionFolder' : 'cells.newItemMenuModal.descriptionFile')}
      </p>
      <CellsNewNodeForm
        type={type}
        onSubmit={handleSubmit}
        inputValue={name}
        onChange={handleChange}
        error={error}
        isOpen={isOpen}
        fileTypeOptions={type === 'file' ? fileTypeOptions : undefined}
        selectedFileType={type === 'file' ? selectedFileType : undefined}
        onFileTypeChange={type === 'file' ? setSelectedFileType : undefined}
      />
      <CellsModal.Actions>
        <CellsModal.SecondaryButton onClick={onClose}>
          {t('cells.newItemMenuModal.secondaryAction')}
        </CellsModal.SecondaryButton>
        <CellsModal.PrimaryButton onClick={handleSubmit} isDisabled={isSubmitting || !name}>
          {t('cells.newItemMenuModal.primaryAction')}
        </CellsModal.PrimaryButton>
      </CellsModal.Actions>
    </CellsModal>
  );
};
