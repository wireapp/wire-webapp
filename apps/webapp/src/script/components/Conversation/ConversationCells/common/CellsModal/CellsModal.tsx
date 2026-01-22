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

import {ReactNode} from 'react';

import {ModalComponent} from 'Components/Modals/ModalComponent';
import {handleEscDown} from 'Util/KeyboardUtil';

import {largeModalStyles, wrapperStyles} from './CellsModal.styles';
import {
  CellsModalActions,
  CellsModalPrimaryButton,
  CellsModalSecondaryButton,
} from './CellsModalActions/CellsModalActions';
import {CellsModalProvider} from './CellsModalContext/CellsModalContext';
import {CellsModalHeader} from './CellsModalHeader/CellsModalHeader';

interface CellsModalProps {
  size?: 'small' | 'large';
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export const CellsModal = ({size = 'small', isOpen, onClose, children}: CellsModalProps) => {
  return (
    <ModalComponent
      isShown={isOpen}
      onClosed={onClose}
      onBgClick={onClose}
      onKeyDown={event => handleEscDown(event, onClose)}
      wrapperCSS={size === 'large' ? largeModalStyles : undefined}
    >
      <CellsModalProvider onClose={onClose}>
        <div css={wrapperStyles}>{children}</div>
      </CellsModalProvider>
    </ModalComponent>
  );
};

CellsModal.Header = CellsModalHeader;
CellsModal.Actions = CellsModalActions;
CellsModal.SecondaryButton = CellsModalSecondaryButton;
CellsModal.PrimaryButton = CellsModalPrimaryButton;
