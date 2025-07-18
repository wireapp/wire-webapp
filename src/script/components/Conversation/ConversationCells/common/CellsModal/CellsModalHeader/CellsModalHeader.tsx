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

import {CloseIcon, IconButton, IconButtonVariant} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {headerStyles, headingStyles, closeButtonStyles} from './CellsModalHeader.styles';

import {useCellsModal} from '../CellsModalContext/CellsModalContext';

interface CellsModalHeaderProps {
  children: ReactNode;
}

export const CellsModalHeader = ({children}: CellsModalHeaderProps) => {
  const {onClose} = useCellsModal();

  return (
    <header css={headerStyles}>
      <h3 css={headingStyles}>{children}</h3>

      <IconButton
        variant={IconButtonVariant.SECONDARY}
        type="button"
        css={closeButtonStyles}
        onClick={onClose}
        aria-label={t('cells.modal.closeButton')}
      >
        <CloseIcon />
      </IconButton>
    </header>
  );
};
