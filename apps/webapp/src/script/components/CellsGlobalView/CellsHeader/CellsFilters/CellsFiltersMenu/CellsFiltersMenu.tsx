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

import {useState} from 'react';

import {CellsRepository} from 'Repositories/cells/CellsRepository';

import {IconButton, IconButtonVariant, OptionsIcon} from '@wireapp/react-ui-kit';

import {buttonStyles, counterStyles} from './CellsFiltersMenu.styles';
import {CellsFiltersModal} from './CellsFiltersModal/CellsFiltersModal';
import {useGetAllTags} from './useGetAllTags/useGetAllTags';

interface CellsFiltersMenuProps {
  activeFiltersCount: number;
  cellsRepository: CellsRepository;
}

export const CellsFiltersMenu = ({activeFiltersCount, cellsRepository}: CellsFiltersMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const {tags} = useGetAllTags({
    cellsRepository,
  });

  return (
    <>
      <IconButton variant={IconButtonVariant.PRIMARY} css={buttonStyles} onClick={() => setIsOpen(true)}>
        <OptionsIcon />
        {activeFiltersCount > 0 && <span css={counterStyles}>{activeFiltersCount}</span>}
      </IconButton>
      <CellsFiltersModal isOpen={isOpen} tags={tags} onClose={() => setIsOpen(false)} />
    </>
  );
};
