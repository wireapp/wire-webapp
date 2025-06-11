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
import {CellsRepository} from 'src/script/cells/CellsRepository';

import {CellsRenameForm} from './CellsRenameForm/CellsRenameForm';
import {useCellsRenameForm} from './useCellsRenameNodeForm/useCellsNewNodeForm';

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
  const {name, error, isSubmitting, handleRename, handleNameChange} = useCellsRenameForm({
    node,
    cellsRepository,
    onSuccess: () => {
      onClose();
      onRefresh();
    },
  });

  return (
    <CellsModal isOpen={isOpen} onClose={onClose}>
      <CellsModal.Header />
      <CellsRenameForm
        isOpen={isOpen}
        onSubmit={handleRename}
        inputValue={name}
        onChange={handleNameChange}
        error={error}
      />
      <CellsModal.Actions>
        <CellsModal.SecondaryButton onClick={onClose}>Close</CellsModal.SecondaryButton>
        <CellsModal.PrimaryButton onClick={handleRename} isDisabled={isSubmitting}>
          Save
        </CellsModal.PrimaryButton>
      </CellsModal.Actions>
    </CellsModal>
  );
};
