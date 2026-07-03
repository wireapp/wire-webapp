/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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
import {useCellsNewFolderForm} from 'Components/Conversation/ConversationCells/common/useCellsNewNodeForm/useCellsNewFolderForm';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {descriptionStyles} from './CellsNewFolderModal.styles';

import {CellsModal} from '../../../common/CellsModal/CellsModal';

interface CellsNewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  onSuccess: () => void;
  currentPath: string;
}

export const CellsNewFolderModal = ({
  isOpen,
  onClose,
  cellsRepository,
  conversationQualifiedId,
  onSuccess,
  currentPath,
}: CellsNewFolderModalProps) => {
  const {translate} = useApplicationContext();
  const {name, error, isSubmitting, handleSubmit, handleChange, handleClear} = useCellsNewFolderForm({
    cellsRepository,
    conversationQualifiedId,
    onSuccess,
    currentPath,
    isOpen,
    validationCopy: {
      genericError: translate('cells.newItemMenuModalForm.genericError'),
      alreadyExistsError: translate('cells.newItemMenuModalForm.alreadyExistsError'),
      invalidCharactersError: translate('cells.newItemMenuModalForm.invalidCharactersError'),
      maxLengthError: translate('cells.newItemMenuModalForm.maxLengthError'),
      nameRequired: translate('cells.newItemMenuModalForm.nameRequired'),
    },
  });

  return (
    <CellsModal isOpen={isOpen} onClose={onClose} size="large">
      <CellsModal.Header>{translate('cells.newItemMenuModal.headlineFolder')}</CellsModal.Header>
      <p css={descriptionStyles}>{translate('cells.newItemMenuModal.descriptionFolder')}</p>
      <CellsNewNodeForm
        label={translate('cells.newItemMenuModal.labelFolder')}
        placeholder={translate('cells.newItemMenuModal.placeholderFolder')}
        onSubmit={handleSubmit}
        inputValue={name}
        onChange={handleChange}
        onClear={handleClear}
        error={error}
        isOpen={isOpen}
      />
      <CellsModal.Actions>
        <CellsModal.SecondaryButton onClick={onClose}>
          {translate('cells.newItemMenuModal.secondaryAction')}
        </CellsModal.SecondaryButton>
        <CellsModal.PrimaryButton onClick={handleSubmit} isDisabled={isSubmitting || name.length === 0}>
          {translate('cells.newItemMenuModal.primaryAction')}
        </CellsModal.PrimaryButton>
      </CellsModal.Actions>
    </CellsModal>
  );
};
