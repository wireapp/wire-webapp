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

import {Button, ButtonVariant, CloseIcon, IconButton, IconButtonVariant} from '@wireapp/react-ui-kit';

import {ModalComponent} from 'Components/Modals/ModalComponent';
import {handleEscDown} from 'Util/KeyboardUtil';

import {
  buttonStyles,
  buttonWrapperStyles,
  closeButtonStyles,
  headerStyles,
  headingStyles,
  modalStyles,
  wrapperStyles,
} from './CellsModal.styles';

interface CellsModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export const CellsModal = ({isOpen, onClose, children}: CellsModalProps) => {
  return (
    <ModalComponent
      isShown={isOpen}
      onClosed={onClose}
      onBgClick={onClose}
      onKeyDown={event => handleEscDown(event, onClose)}
      wrapperCSS={modalStyles}
    >
      <div css={wrapperStyles}>{children}</div>
    </ModalComponent>
  );
};

const CellsModalHeader = ({onClose}: {onClose: () => void}) => {
  return (
    <header css={headerStyles}>
      <h3 css={headingStyles}>test </h3>

      <IconButton
        variant={IconButtonVariant.SECONDARY}
        type="button"
        css={closeButtonStyles}
        onClick={onClose}
        aria-label={'close'}
      >
        <CloseIcon />
      </IconButton>
    </header>
  );
};

const CellsModalActions = ({children}: {children: ReactNode}) => {
  return <div css={buttonWrapperStyles}>{children}</div>;
};

const CellsModalSecondaryButton = ({children, onClick}: {children: ReactNode; onClick: () => void}) => {
  return (
    <Button variant={ButtonVariant.SECONDARY} type="button" onClick={onClick} css={buttonStyles}>
      {children}
    </Button>
  );
};

const CellsModalPrimaryButton = ({
  children,
  onClick,
  isDisabled,
}: {
  children: ReactNode;
  onClick: () => void;
  isDisabled: boolean;
}) => {
  return (
    <Button variant={ButtonVariant.PRIMARY} css={buttonStyles} disabled={isDisabled} onClick={onClick}>
      {children}
    </Button>
  );
};

CellsModal.Header = CellsModalHeader;
CellsModal.Actions = CellsModalActions;
CellsModal.SecondaryButton = CellsModalSecondaryButton;
CellsModal.PrimaryButton = CellsModalPrimaryButton;
