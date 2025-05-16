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

import {CellsNewItemForm} from 'Components/Conversation/ConversationCells/common/CellsNewItemForm/CellsNewItemForm';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {CellsRepository} from 'src/script/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';

import {closeButtonStyles, headerStyles, headingStyles, wrapperStyles} from './CellsNewItemModal.styles';

import {CellItem} from '../../../common/cellFile/cellFile';

interface CellsNewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: CellItem['type'];
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
  return (
    <ModalComponent isShown={isOpen} onClosed={onClose} onBgClick={onClose}>
      <div css={wrapperStyles}>
        <header css={headerStyles}>
          <h3 css={headingStyles}>
            {t(type === 'folder' ? 'cellNewItemMenuModal.headlineFolder' : 'cellNewItemMenuModal.headlineFile')}
          </h3>
          <IconButton
            variant={IconButtonVariant.SECONDARY}
            type="button"
            css={closeButtonStyles}
            onClick={onClose}
            aria-label={t('cellNewItemMenuModal.closeButton')}
          >
            <CloseIcon />
          </IconButton>
        </header>
        <CellsNewItemForm
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
