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

import {CloseIcon, IconButton, IconButtonVariant} from '@wireapp/react-ui-kit';

import {CellsNewNodeForm} from 'Components/Conversation/ConversationCells/common/CellsNewNodeForm/CellsNewNodeForm';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {CellsRepository} from 'src/script/cells/CellsRepository';
import {handleEscDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {
  closeButtonStyles,
  descriptionStyles,
  headerStyles,
  headingStyles,
  modalStyles,
  wrapperStyles,
} from './CellsNewItemModal.styles';

import {CellNode} from '../../../common/cellNode/cellNode';

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
          <h3 css={headingStyles}>
            {t(isFolder ? 'cells.newItemMenuModal.headlineFolder' : 'cells.newItemMenuModal.headlineFile')}
          </h3>

          <IconButton
            variant={IconButtonVariant.SECONDARY}
            type="button"
            css={closeButtonStyles}
            onClick={onClose}
            aria-label={t('cells.newItemMenuModal.closeButton')}
          >
            <CloseIcon />
          </IconButton>
        </header>
        <p css={descriptionStyles}>
          {t(isFolder ? 'cells.newItemMenuModal.descriptionFolder' : 'cells.newItemMenuModal.descriptionFile')}
        </p>
        <CellsNewNodeForm
          type={type}
          cellsRepository={cellsRepository}
          conversationQualifiedId={conversationQualifiedId}
          onSuccess={onSuccess}
          currentPath={currentPath}
          onSecondaryButtonClick={onClose}
        />
      </div>
    </ModalComponent>
  );
};
