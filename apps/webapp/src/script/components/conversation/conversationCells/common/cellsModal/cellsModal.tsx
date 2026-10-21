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

import {ReactNode, type FunctionComponent, type ReactElement} from 'react';

import {ModalComponent} from 'Components/Modals/ModalComponent';
import {handleEscDown} from 'Util/keyboardUtil';

import {largeModalStyles, wrapperStyles} from './cellsModal.styles';
import {
  CellsModalActions,
  CellsModalPrimaryButton,
  CellsModalSecondaryButton,
} from './cellsModalActions/cellsModalActions';
import {CellsModalProvider} from './cellsModalContext/cellsModalContext';
import {CellsModalHeader} from './cellsModalHeader/cellsModalHeader';

interface CellsModalProps {
  size?: 'small' | 'large';
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

type CellsModalComponent = FunctionComponent<CellsModalProps> & {
  Header: typeof CellsModalHeader;
  Actions: typeof CellsModalActions;
  SecondaryButton: typeof CellsModalSecondaryButton;
  PrimaryButton: typeof CellsModalPrimaryButton;
};

function CellsModal(options: CellsModalProps): ReactElement {
  const {size = 'small', isOpen, onClose, children} = options;
  return (
    <ModalComponent
      isShown={isOpen}
      onClosed={onClose}
      onBgClick={onClose}
      onKeyDown={event => {
        return handleEscDown(event, onClose);
      }}
      wrapperCSS={size === 'large' ? largeModalStyles : undefined}
    >
      <CellsModalProvider onClose={onClose}>
        <div css={wrapperStyles}>{children}</div>
      </CellsModalProvider>
    </ModalComponent>
  );
}

const CellsModalWithSubcomponents: CellsModalComponent = Object.assign(CellsModal, {
  Header: CellsModalHeader,
  Actions: CellsModalActions,
  SecondaryButton: CellsModalSecondaryButton,
  PrimaryButton: CellsModalPrimaryButton,
});

export {CellsModalWithSubcomponents as CellsModal};
