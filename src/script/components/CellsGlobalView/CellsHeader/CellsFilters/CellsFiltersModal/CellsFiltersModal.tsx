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

import {Accordion, Button, ButtonVariant, ComboboxSelect, IconButton, IconButtonVariant} from '@wireapp/react-ui-kit';

import {CloseIcon} from 'Components/Icon';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {handleEscDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {
  actionsWrapperStyles,
  buttonStyles,
  closeButtonStyles,
  contentStyles,
  headerStyles,
  headingStyles,
  menuListCSS,
  modalStyles,
  selectWrapperStyles,
  wrapperStyles,
} from './CellsFiltersModal.styles';
import {useModalFilters} from './useModalFilters/useModalFilters';

interface CellsFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: string[];
}

export const CellsFiltersModal = ({isOpen, onClose, tags}: CellsFiltersModalProps) => {
  const {tags: selectedTags, setTags, handleSave} = useModalFilters(isOpen);

  const handleSaveAndClose = () => {
    handleSave();
    onClose();
  };

  return (
    <ModalComponent
      isShown={isOpen}
      onClosed={onClose}
      onBgClick={onClose}
      wrapperCSS={modalStyles}
      onKeyDown={event => handleEscDown(event, onClose)}
    >
      <div css={wrapperStyles}>
        <header css={headerStyles}>
          <h3 css={headingStyles}>{t('cells.tagsModal.title')}</h3>
          <IconButton
            variant={IconButtonVariant.SECONDARY}
            type="button"
            css={closeButtonStyles}
            onClick={onClose}
            aria-label={t('cells.tagsModal.closeButton')}
          >
            <CloseIcon />
          </IconButton>
        </header>
        <div css={contentStyles}>
          <Accordion>
            <Accordion.Item title="Type" value="type">
              test
            </Accordion.Item>
            <Accordion.Item title="Tags" value="tags">
              <div css={selectWrapperStyles}>
                <ComboboxSelect
                  id="tags"
                  label={t('cells.tagsModal.label')}
                  placeholder={t('cells.tagsModal.placeholder')}
                  menuPortalTarget={document.body}
                  options={tags.map(tag => ({label: tag, value: tag}))}
                  value={selectedTags.map(tag => ({label: tag, value: tag}))}
                  menuListCSS={menuListCSS}
                  isLoading={false}
                  onChange={value => setTags(Array.isArray(value) ? value.map(option => option.value as string) : [])}
                  onCreateOption={() => {}}
                  createOptionLabel={name => t('cells.tagsModal.createOptionLabel', {name})}
                  noOptionsMessage={t('cells.tagsModal.noTagsFound')}
                  loadingMessage={t('cells.tagsModal.loading')}
                />
              </div>
            </Accordion.Item>
          </Accordion>
        </div>
        <div css={actionsWrapperStyles}>
          <Button variant={ButtonVariant.SECONDARY} onClick={onClose} css={buttonStyles}>
            {t('cells.tagsModal.cancelButton')}
          </Button>
          <Button variant={ButtonVariant.PRIMARY} css={buttonStyles} onClick={handleSaveAndClose}>
            {t('cells.tagsModal.saveButton')}
          </Button>
        </div>
      </div>
    </ModalComponent>
  );
};
