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

import {CellsNewNodeForm} from 'Components/Conversation/ConversationCells/common/CellsNewNodeForm/CellsNewNodeForm';
import {
  CellsFileType,
  getFileExtensionByType,
  useCellsNewFileForm,
} from 'Components/Conversation/ConversationCells/common/useCellsNewNodeForm/useCellsNewFileForm';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {t} from 'Util/localizerUtil';

import {descriptionStyles} from './CellsNewFileModal.styles';

import {CellsModal} from '../../../common/CellsModal/CellsModal';

interface CellsNewFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileType: CellsFileType;
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  onSuccess: () => void;
  currentPath: string;
}

export const CellsNewFileModal = ({
  isOpen,
  onClose,
  fileType,
  cellsRepository,
  conversationQualifiedId,
  onSuccess,
  currentPath,
}: CellsNewFileModalProps) => {
  const {name, error, isSubmitting, handleSubmit, handleChange, handleClear} = useCellsNewFileForm({
    fileType,
    cellsRepository,
    conversationQualifiedId,
    onSuccess,
    currentPath,
    isOpen,
  });
  const fileExtension = getFileExtensionByType(fileType);
  const headline = `${t('cells.newItemMenuModal.headlineFile', {fileType})} (.${fileExtension})`;

  return (
    <CellsModal isOpen={isOpen} onClose={onClose} size="large">
      <CellsModal.Header>{headline}</CellsModal.Header>
      <p css={descriptionStyles}>{t('cells.newItemMenuModal.descriptionFile')}</p>
      <CellsNewNodeForm
        label={t('cells.newItemMenuModal.labelFile')}
        placeholder={t('cells.newItemMenuModal.placeholderFile')}
        onSubmit={handleSubmit}
        inputValue={name}
        onChange={handleChange}
        onClear={handleClear}
        error={error}
        isOpen={isOpen}
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
