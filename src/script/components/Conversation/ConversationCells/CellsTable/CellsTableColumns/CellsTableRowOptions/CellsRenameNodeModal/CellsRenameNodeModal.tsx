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

import {CellNode} from 'Components/Conversation/ConversationCells/common/cellNode/cellNode';
import {CellsModal} from 'Components/Conversation/ConversationCells/common/CellsModal/CellsModal';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';

import {CellsRenameForm} from './CellsRenameForm/CellsRenameForm';
import {useCellsRenameForm} from './useCellsRenameNodeForm/useCellsRenameNodeForm';

interface CellsRenameNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: CellNode;
  cellsRepository: CellsRepository;
  onRefresh: () => void;
}

export const CellsRenameNodeModal = ({
  isOpen,
  onClose,
  node,
  cellsRepository,
  onRefresh,
}: CellsRenameNodeModalProps) => {
  const {name, error, isSubmitting, isDisabled, handleRename, handleNameChange, handleClearName} = useCellsRenameForm({
    node,
    cellsRepository,
    onSuccess: () => {
      onClose();
      onRefresh();
    },
  });

  return (
    <CellsModal isOpen={isOpen} onClose={onClose} size="large">
      <CellsModal.Header>
        {t(node.type === 'file' ? 'cells.renameNodeModal.headline.file' : 'cells.renameNodeModal.headline.folder')}
      </CellsModal.Header>
      <CellsRenameForm
        isOpen={isOpen}
        onSubmit={handleRename}
        name={name}
        onChangeName={handleNameChange}
        onClearName={handleClearName}
        error={error}
      />
      <CellsModal.Actions>
        <CellsModal.SecondaryButton onClick={onClose}>
          {t('cells.renameNodeModal.cancelButton')}
        </CellsModal.SecondaryButton>
        <CellsModal.PrimaryButton onClick={handleRename} isDisabled={isDisabled} isLoading={isSubmitting}>
          {t('cells.renameNodeModal.saveButton')}
        </CellsModal.PrimaryButton>
      </CellsModal.Actions>
    </CellsModal>
  );
};
