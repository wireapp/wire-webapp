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

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {buttonStyles, wrapperStyles} from './CellsFiltersModalActions.styles';

interface CellsFiltersModalActionsProps {
  onSecondaryAction: () => void;
  onPrimaryAction: () => void;
}
export const CellsFiltersModalActions = ({onSecondaryAction, onPrimaryAction}: CellsFiltersModalActionsProps) => {
  return (
    <div css={wrapperStyles}>
      <Button variant={ButtonVariant.SECONDARY} onClick={onSecondaryAction} css={buttonStyles}>
        {t('cells.filtersModal.secondaryAction')}
      </Button>
      <Button variant={ButtonVariant.PRIMARY} css={buttonStyles} onClick={onPrimaryAction}>
        {t('cells.filtersModal.primaryAction')}
      </Button>
    </div>
  );
};
