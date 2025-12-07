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

import {ModalComponent} from 'Components/Modals/ModalComponent';
import {handleEscDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {Accordion} from '@wireapp/react-ui-kit';

import {CellsFilterModalHeader} from './CellsFilterModalHeader/CellsFilterModalHeader';
import {contentStyles, modalStyles, wrapperStyles} from './CellsFiltersModal.styles';
import {CellsFiltersModalActions} from './CellsFiltersModalActions/CellsFiltersModalActions';
import {CellsTagsFilter} from './CellsTagsFilter/CellsTagsFilter';
import {useModalFilters} from './useModalFilters/useModalFilters';

interface CellsFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: string[];
}

export const CellsFiltersModal = ({isOpen, onClose, tags}: CellsFiltersModalProps) => {
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
            <Accordion.Item title={t('cells.filtersModal.accordion.tags')} value="tags">
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
