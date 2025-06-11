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

import {CloseIcon, IconButton, IconButtonVariant} from '@wireapp/react-ui-kit';

import {CellNode} from 'Components/Conversation/ConversationCells/common/cellNode/cellNode';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {CellsRepository} from 'src/script/cells/CellsRepository';
import {handleEscDown} from 'Util/KeyboardUtil';

import {CellsRenameForm} from './CellsRenameForm/CellsRenameForm';
import {
  modalStyles,
  wrapperStyles,
  headerStyles,
  headingStyles,
  closeButtonStyles,
} from './CellsRenameNodeModal.styles';

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
  return (
    <ModalComponent
      isShown={isOpen}
      onClosed={onClose}
      onBgClick={onClose}
      onKeyDown={event => handleEscDown(event, onClose)}
      wrapperCSS={modalStyles}
    >
      <div css={wrapperStyles}>
        <header css={headerStyles}>
          <h3 css={headingStyles}>Rename</h3>
          <IconButton
            variant={IconButtonVariant.SECONDARY}
            type="button"
            css={closeButtonStyles}
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon />
          </IconButton>
        </header>
        <CellsRenameForm
          node={node}
          cellsRepository={cellsRepository}
          onSuccess={() => {
            onClose();
            onRefresh();
          }}
          onSecondaryButtonClick={onClose}
          isOpen={isOpen}
        />
      </div>
    </ModalComponent>
  );
};
