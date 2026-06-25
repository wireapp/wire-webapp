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

import {Accordion} from '@wireapp/react-ui-kit';

import {ModalComponent} from 'Components/modals/modalComponent';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {handleEscDown} from 'Util/keyboardUtil';

import {CellsFilterModalHeader} from './cellsFilterModalHeader/cellsFilterModalHeader';
import {contentStyles, modalStyles, wrapperStyles} from './cellsFiltersModal.styles';
import {CellsFiltersModalActions} from './cellsFiltersModalActions/cellsFiltersModalActions';
import {CellsTagsFilter} from './cellsTagsFilter/cellsTagsFilter';
import {useModalFilters} from './useModalFilters/useModalFilters';

interface CellsFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: string[];
}

export const CellsFiltersModal = ({isOpen, onClose, tags}: CellsFiltersModalProps) => {
  const {translate} = useApplicationContext();
  const {tags: selectedTags, setTags, handleSave} = useModalFilters({enabled: isOpen});

  return (
    <ModalComponent
      isShown={isOpen}
      onClosed={onClose}
      onBgClick={onClose}
      wrapperCSS={modalStyles}
      onKeyDown={event => handleEscDown(event, onClose)}
    >
      <div css={wrapperStyles}>
        <CellsFilterModalHeader onClose={onClose} />
        <div css={contentStyles}>
          <Accordion defaultValue="tags">
            <Accordion.Item title={translate('cells.filtersModal.accordion.tags')} value="tags">
              <CellsTagsFilter allTags={tags} selectedTags={selectedTags} onTagsChange={setTags} />
            </Accordion.Item>
          </Accordion>
        </div>
        <CellsFiltersModalActions
          onSecondaryAction={onClose}
          onPrimaryAction={() => {
            handleSave();
            onClose();
          }}
        />
      </div>
    </ModalComponent>
  );
};
