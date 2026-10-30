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

import type {FunctionComponent} from 'react';

import type {CSSObject} from '@emotion/react';

import {CellsModal} from 'Components/conversation/conversationCells/common/cellsModal/cellsModal';
import {useApplicationContext} from 'src/script/page/rootProvider';

const confirmationContentStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '0 16px 16px',
};

const confirmationTextStyles: CSSObject = {
  margin: 0,
};

interface CellsBulkMoveToBinConfirmationModalProps {
  isOpen: boolean;
  selectedRootCount: number;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const CellsBulkMoveToBinConfirmationModal: FunctionComponent<CellsBulkMoveToBinConfirmationModalProps> = ({
  isOpen,
  selectedRootCount,
  isSubmitting,
  onClose,
  onConfirm,
}: CellsBulkMoveToBinConfirmationModalProps) => {
  const {translate} = useApplicationContext();
  const handleClose = (): void => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <CellsModal isOpen={isOpen} onClose={handleClose}>
      <CellsModal.Header>{translate('cells.bulkMoveToBin.confirmation.title')}</CellsModal.Header>
      <div css={confirmationContentStyles}>
        <p css={confirmationTextStyles}>
          {translate('cells.bulkMoveToBin.confirmation.description', {count: selectedRootCount})}
        </p>
        {isSubmitting && (
          <p css={confirmationTextStyles} role="status">
            {translate('cells.bulkMoveToBin.moving', {count: selectedRootCount})}
          </p>
        )}
      </div>
      <CellsModal.Actions>
        <CellsModal.SecondaryButton onClick={handleClose}>
          {translate('cells.bulkMoveToBin.confirmation.cancel')}
        </CellsModal.SecondaryButton>
        <CellsModal.PrimaryButton onClick={onConfirm} isDisabled={isSubmitting}>
          {translate('cells.bulkMoveToBin.confirmation.confirm')}
        </CellsModal.PrimaryButton>
      </CellsModal.Actions>
    </CellsModal>
  );
};
